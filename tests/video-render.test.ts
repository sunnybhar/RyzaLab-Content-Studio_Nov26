import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importProject, serializeProject } from "../lib/studio/exports";
import type { MediaProject } from "../lib/studio/types";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts/render-video.mjs");
const available = ["/usr/bin/ffmpeg", "/usr/bin/ffprobe"].every(
  (binary) => spawnSync(binary, ["-version"], { stdio: "ignore" }).status === 0,
);
const skip = available
  ? false
  : "ffmpeg/ffprobe unavailable; install them to run real MP4 composition tests.";
let directory = "",
  assets = "",
  sequence = 0;
before(async () => {
  if (!available) return;
  directory = await mkdtemp(path.join(os.tmpdir(), "studio-video-test-"));
  assets = path.join(directory, "assets");
  await mkdir(assets);
  await exec("/usr/bin/ffmpeg", [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=64x48:rate=30:duration=0.4",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=48000:duration=0.4",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-threads",
    "1",
    "-c:a",
    "aac",
    "-t",
    "0.4",
    path.join(assets, "clip.mp4"),
  ]);
  await exec("/usr/bin/ffmpeg", [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "color=c=green:size=64x48",
    "-frames:v",
    "1",
    "-threads",
    "1",
    path.join(assets, "still.png"),
  ]);
  await exec("/usr/bin/ffmpeg", [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=880:sample_rate=48000:duration=0.4",
    "-c:a",
    "pcm_s16le",
    path.join(assets, "override.wav"),
  ]);
});
after(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});
function media(): MediaProject {
  return {
    slides: [],
    scenes: [
      {
        id: "video",
        title: "Local video",
        script: "Opening caption",
        sourceUrl: "clip.mp4",
        duration: 0.4,
        preserveAudio: true,
      },
      {
        id: "still",
        title: "Local still",
        script: "Closing caption",
        sourceUrl: "still.png",
        audioUrl: "override.wav",
        duration: 0.4,
        preserveAudio: false,
      },
    ],
    imagePrompt: "",
    narration: "Written narration is editable; no speech is synthesized.",
    captions: "Opening caption\nClosing caption",
    aspect: "9:16",
  };
}
async function run(project: MediaProject, aspect?: string, captions = false) {
  const id = ++sequence,
    projectFile = path.join(directory, `project-${id}.json`),
    output = path.join(directory, `render-${id}.mp4`);
  await writeFile(projectFile, serializeProject(project));
  const args = [
    script,
    "--project",
    projectFile,
    "--assets-dir",
    assets,
    "--output",
    output,
    ...(aspect ? ["--aspect", aspect] : []),
    ...(captions ? ["--captions"] : []),
  ];
  const result = await exec(process.execPath, args, {
    cwd: root,
    timeout: 120000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return { output, projectFile, manifest: JSON.parse(result.stdout) };
}
async function probe(file: string) {
  const result = await exec("/usr/bin/ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    file,
  ]);
  return JSON.parse(result.stdout);
}
async function samples(file: string, start: number) {
  const result = await exec(
    "/usr/bin/ffmpeg",
    [
      "-nostdin",
      "-v",
      "error",
      "-ss",
      String(start),
      "-i",
      file,
      "-t",
      "0.15",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "8000",
      "-f",
      "f32le",
      "pipe:1",
    ],
    { encoding: "buffer", maxBuffer: 1024 * 1024 },
  );
  const bytes = result.stdout;
  const values = [];
  for (let index = 0; index + 4 <= bytes.length; index += 4)
    values.push(bytes.readFloatLE(index));
  return values;
}
function rms(values: number[]) {
  return Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0) / values.length,
  );
}
function energy(values: number[], frequency: number) {
  let real = 0,
    imaginary = 0;
  for (let index = 0; index < values.length; index++) {
    const angle = (2 * Math.PI * frequency * index) / 8000;
    real += values[index] * Math.cos(angle);
    imaginary += values[index] * Math.sin(angle);
  }
  return real * real + imaginary * imaginary;
}

for (const [aspect, width, height] of [
  ["9:16", 1080, 1920],
  ["16:9", 1920, 1080],
  ["1:1", 1080, 1080],
] as const) {
  test(
    `real MP4 composes a video and still at ${aspect}, preserving source audio and applying separate audio`,
    { skip },
    async () => {
      const project = media();
      const result = await run(project, aspect, aspect === "1:1");
      const information = await probe(result.output);
      const video = information.streams.find(
        (stream: { codec_type: string }) => stream.codec_type === "video",
      );
      const audio = information.streams.find(
        (stream: { codec_type: string }) => stream.codec_type === "audio",
      );
      assert.equal(video.codec_name, "h264");
      assert.equal(video.width, width);
      assert.equal(video.height, height);
      assert.equal(video.pix_fmt, "yuv420p");
      assert.equal(audio.codec_name, "aac");
      assert.equal(audio.channels, 2);
      assert.ok(
        Math.abs(Number(information.format.duration) - 0.8) < 0.12,
        `Expected ~0.8 seconds; got ${information.format.duration}.`,
      );
      assert.ok((await stat(result.output)).size > 1000);
      assert.equal(result.manifest.aspect, aspect);
      assert.equal(result.manifest.scenes, 2);
      assert.equal(
        await readFile(result.output.replace(/\.mp4$/, ".srt"), "utf8"),
        "1\n00:00:00,000 --> 00:00:00,400\nOpening caption\n\n2\n00:00:00,400 --> 00:00:00,800\nClosing caption\n",
      );
      const restored = importProject(
        await readFile(result.output.replace(/\.mp4$/, ".source.json"), "utf8"),
      );
      assert.deepEqual(restored, { ...project, aspect });
      const opening = await samples(result.output, 0.12),
        closing = await samples(result.output, 0.55);
      assert.ok(
        rms(opening) > 0.01,
        "preserveAudio must retain the video source tone.",
      );
      assert.ok(
        energy(opening, 440) > energy(opening, 880) * 5,
        "Opening uses the original 440 Hz audio.",
      );
      assert.ok(rms(closing) > 0.01, "Separate scene audio must be present.");
      assert.ok(
        energy(closing, 880) > energy(closing, 440) * 5,
        "Closing uses the separate 880 Hz audio.",
      );
      if (aspect === "1:1") {
        const frame = await exec(
          "/usr/bin/ffmpeg",
          [
            "-nostdin",
            "-v",
            "error",
            "-ss",
            "0.6",
            "-i",
            result.output,
            "-frames:v",
            "1",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "pipe:1",
          ],
          { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 },
        );
        let white = 0;
        for (let index = 0; index < frame.stdout.length; index += 3)
          if (
            frame.stdout[index] > 200 &&
            frame.stdout[index + 1] > 200 &&
            frame.stdout[index + 2] > 200
          )
            white++;
        assert.ok(
          white > 30,
          "Burned captions add actual white glyphs over the green still.",
        );
      }
    },
  );
}

test(
  "disabling preserveAudio and omitting overrides produces an actual silent audio track",
  { skip },
  async () => {
    const project = media();
    project.scenes.forEach((scene) => {
      scene.preserveAudio = false;
      delete scene.audioUrl;
    });
    const result = await run(project, "1:1");
    assert.ok(rms(await samples(result.output, 0.12)) < 0.0001);
    assert.ok(rms(await samples(result.output, 0.55)) < 0.0001);
  },
);

test(
  "filenames containing shell syntax are treated as local filenames",
  { skip },
  async () => {
    const name = "clip;touch${IFS}INJECTED.mp4";
    await copyFile(path.join(assets, "clip.mp4"), path.join(assets, name));
    const project = media();
    project.scenes = [{ ...project.scenes[0], sourceUrl: name }];
    project.captions = "Safe local media";
    const result = await run(project, "1:1");
    assert.ok((await stat(result.output)).size > 1000);
    await assert.rejects(stat(path.join(assets, "INJECTED")), /ENOENT/);
    await assert.rejects(stat(path.join(root, "INJECTED")), /ENOENT/);
  },
);

test(
  "remote sources, traversal paths, symlink escapes, and missing media fail before producing MP4s",
  { skip },
  async () => {
    await copyFile(
      path.join(assets, "clip.mp4"),
      path.join(directory, "outside.mp4"),
    );
    await symlink(
      path.join(directory, "outside.mp4"),
      path.join(assets, "escape.mp4"),
    );
    for (const [sourceUrl, message] of [
      ["https://remote.example/video.mp4", /remote URLs/],
      ["../outside.mp4", /inside --assets-dir/],
      ["escape.mp4", /symlink escapes/],
      ["missing.mp4", /does not exist/],
    ] as const) {
      const project = media();
      project.scenes[0].sourceUrl = sourceUrl;
      const id = sequence + 1;
      await assert.rejects(run(project), (error) =>
        message.test(String(error)),
      );
      await assert.rejects(
        stat(path.join(directory, `render-${id}.mp4`)),
        /ENOENT/,
      );
    }
    const project = media();
    project.scenes[0].audioUrl = "../outside.mp4";
    await assert.rejects(run(project), /inside --assets-dir/);
  },
);

test(
  "invalid caption timing and unsupported ratios fail clearly without substituting placeholders",
  { skip },
  async () => {
    const project = media();
    project.captions =
      "1\n00:00:00,000 --> 00:00:02,000\nOutside the 0.8-second timeline";
    await assert.rejects(
      run(project, "9:16", true),
      /within the video duration/,
    );
    await assert.rejects(run(media(), "4:3"), /Aspect must be/);
    const missing = media();
    delete missing.scenes[0].sourceUrl;
    await assert.rejects(run(missing), /scene media is missing/);
  },
);

test(
  "frame-rounded scene durations are reflected in editable source and script-derived subtitle boundaries",
  { skip },
  async () => {
    const project = media();
    project.scenes[0].duration = 0.41;
    project.scenes[1].duration = 0.41;
    project.captions = "";
    const result = await run(project, "1:1");
    const restored = importProject(
      await readFile(result.output.replace(/\.mp4$/, ".source.json"), "utf8"),
    );
    assert.ok(Math.abs(restored.scenes[0].duration - 13 / 30) < 1e-9);
    assert.ok(Math.abs(restored.scenes[1].duration - 13 / 30) < 1e-9);
    assert.equal(
      await readFile(result.output.replace(/\.mp4$/, ".srt"), "utf8"),
      "1\n00:00:00,000 --> 00:00:00,433\nOpening caption\n\n2\n00:00:00,433 --> 00:00:00,867\nClosing caption\n",
    );
    assert.ok(Math.abs(result.manifest.duration - 26 / 30) < 1e-9);
  },
);

test(
  "the same local inputs produce identical MP4 bytes and existing outputs are preserved",
  { skip },
  async () => {
    const first = await run(media(), "1:1"),
      second = await run(media(), "1:1");
    const original = await readFile(first.output);
    assert.deepEqual(await readFile(second.output), original);
    await assert.rejects(
      exec(
        process.execPath,
        [
          script,
          "--project",
          first.projectFile,
          "--assets-dir",
          assets,
          "--output",
          first.output,
        ],
        { cwd: root },
      ),
      /Output already exists/,
    );
    assert.deepEqual(await readFile(first.output), original);
  },
);
