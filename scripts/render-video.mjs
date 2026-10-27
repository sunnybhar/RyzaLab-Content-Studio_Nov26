#!/usr/bin/env node
/** Local composition only: this script never generates scenes, speech, or remote media. */
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
  copyFile,
  lstat,
  mkdtemp,
  open,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";

const FPS = 30;
const SIZES = {
  "9:16": [1080, 1920],
  "16:9": [1920, 1080],
  "1:1": [1080, 1080],
};
const VIDEO_FORMATS = {
  ".mp4": "mov",
  ".mov": "mov",
  ".m4v": "mov",
  ".webm": "matroska",
  ".mkv": "matroska",
  ".png": "image2",
  ".jpg": "image2",
  ".jpeg": "image2",
};
const AUDIO_FORMATS = {
  ".mp3": "mp3",
  ".wav": "wav",
  ".m4a": "mov",
  ".aac": "aac",
  ".flac": "flac",
  ".ogg": "ogg",
  ".webm": "matroska",
  ".mp4": "mov",
};
const FFMPEG = "/usr/bin/ffmpeg";
const FFPROBE = "/usr/bin/ffprobe";
const FONT_DIRECTORY = "/usr/share/fonts/truetype/dejavu";
const help =
  "Usage: node scripts/render-video.mjs --project project.json --assets-dir DIR --output output.mp4 [--aspect 9:16|16:9|1:1] [--captions]";

function command(binary, args, cwd) {
  return new Promise((resolve, reject) => {
    // All processes receive argument arrays and controlled filters, never shell commands.
    const child = spawn(binary, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "",
      stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), 10 * 60 * 1000);
    child.stdout.on("data", (chunk) => {
      stdout = (stdout + chunk.toString()).slice(-1024 * 1024);
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-16000);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(
        new Error(`Could not start ${path.basename(binary)}: ${error.message}`),
      );
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else
        reject(
          new Error(
            `${path.basename(binary)} failed${code === null ? " or timed out" : ` (${code})`}: ${stderr.trim()}`,
          ),
        );
    });
  });
}
function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}
async function stageAsset(source, root, destination, formats, label) {
  if (typeof source !== "string" || !source)
    throw new Error(
      `${label}: scene media is missing. Set a local sourceUrl inside --assets-dir.`,
    );
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(source) ||
    source.startsWith("//") ||
    /[\u0000-\u001f]/.test(source)
  )
    throw new Error(
      `${label}: remote URLs and URL schemes are not allowed; use a local asset path.`,
    );
  const candidate = path.resolve(root, source);
  if (!isInside(root, candidate))
    throw new Error(`${label}: asset path must remain inside --assets-dir.`);
  let canonical;
  try {
    canonical = await realpath(candidate);
  } catch {
    throw new Error(`${label}: local asset does not exist: ${source}`);
  }
  if (!isInside(root, canonical))
    throw new Error(`${label}: symlink escapes --assets-dir.`);
  const extension = path.extname(canonical).toLowerCase(),
    format = formats[extension];
  if (!format)
    throw new Error(
      `${label}: unsupported local media extension ${extension || "(none)"}.`,
    );
  // O_NOFOLLOW prevents replacing the final file with a symlink after realpath validation.
  const handle = await open(
    canonical,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > 512 * 1024 * 1024)
      throw new Error(
        `${label}: choose a regular media file no larger than 512 MB.`,
      );
    // On Linux validate the opened descriptor, including any parent-directory symlink race.
    if (process.platform === "linux") {
      const openedPath = await realpath(`/proc/self/fd/${handle.fd}`);
      if (!isInside(root, openedPath))
        throw new Error(`${label}: opened asset escapes --assets-dir.`);
    }
    const output = await open(destination, "wx");
    try {
      const buffer = Buffer.alloc(1024 * 1024);
      let position = 0;
      while (position < info.size) {
        const { bytesRead } = await handle.read(
          buffer,
          0,
          Math.min(buffer.length, info.size - position),
          position,
        );
        if (!bytesRead)
          throw new Error(`${label}: asset changed while being copied.`);
        let offset = 0;
        while (offset < bytesRead) {
          const { bytesWritten } = await output.write(
            buffer,
            offset,
            bytesRead - offset,
            position + offset,
          );
          if (!bytesWritten) throw new Error("Could not write staged media.");
          offset += bytesWritten;
        }
        position += bytesRead;
      }
    } finally {
      await output.close();
    }
  } finally {
    await handle.close();
  }
  return { format, extension };
}
function inputArgs(asset, file) {
  return [
    "-protocol_whitelist",
    "file,pipe",
    "-f",
    asset.format,
    ...(asset.format === "image2"
      ? ["-pattern_type", "none", "-loop", "1", "-framerate", String(FPS)]
      : []),
    "-i",
    file,
  ];
}
async function probe(asset, file, cwd) {
  const result = await command(
    FFPROBE,
    [
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-f",
      asset.format,
      ...(asset.format === "image2" ? ["-pattern_type", "none"] : []),
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      file,
    ],
    cwd,
  );
  return JSON.parse(result);
}
async function ensureAbsent(file) {
  try {
    await lstat(file);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  throw new Error(
    `Output already exists: ${file}. Choose a new output filename.`,
  );
}

/** Compose local scenes into a real H.264/AAC MP4. Durations round up to whole frames. */
export async function renderVideo(options) {
  if (!options.project || !options.assetsDir || !options.output)
    throw new Error(help);
  if (options.aspect && !SIZES[options.aspect])
    throw new Error("Aspect must be 9:16, 16:9, or 1:1.");
  await Promise.all([
    access(FFMPEG, constants.X_OK),
    access(FFPROBE, constants.X_OK),
  ]).catch(() => {
    throw new Error("Install ffmpeg and ffprobe at /usr/bin before rendering.");
  });
  const projectPath = path.resolve(options.project);
  if ((await stat(projectPath)).size > 32 * 1024 * 1024)
    throw new Error("Project JSON exceeds the 32 MB limit.");
  const { importProject, serializeProject, buildSrt } = await tsImport(
    "../lib/studio/exports.ts",
    import.meta.url,
  );
  const media = importProject(await readFile(projectPath, "utf8"));
  if (!media.scenes.length)
    throw new Error("Add completed local scenes before rendering.");
  const aspect = options.aspect || media.aspect;
  media.aspect = aspect;
  const [width, height] = SIZES[aspect];
  // Editable source and script-derived captions use the actual rendered frame boundaries.
  for (const scene of media.scenes)
    scene.duration = Math.max(1, Math.ceil(scene.duration * FPS - 1e-8)) / FPS;
  let root;
  try {
    root = await realpath(path.resolve(options.assetsDir));
    if (!(await stat(root)).isDirectory()) throw new Error();
  } catch {
    throw new Error("--assets-dir must be an existing local directory.");
  }
  const output = path.resolve(options.output);
  if (path.extname(output).toLowerCase() !== ".mp4")
    throw new Error("--output must have an .mp4 extension.");
  const stem = output.slice(0, -4),
    srtOutput = `${stem}.srt`,
    sourceOutput = `${stem}.source.json`;
  await Promise.all([
    ensureAbsent(output),
    ensureAbsent(srtOutput),
    ensureAbsent(sourceOutput),
  ]);
  // Explicitly supplied captions must be valid. Without captions, scripts provide editable SRT.
  const hasCaptions =
    media.captions.trim() || media.scenes.some((scene) => scene.script.trim());
  const srt = hasCaptions ? buildSrt(media) : "";
  if (options.captions && !srt)
    throw new Error(
      "Caption burning needs editable captions or scene scripts.",
    );
  if (options.captions)
    await access(path.join(FONT_DIRECTORY, "DejaVuSans.ttf")).catch(() => {
      throw new Error(
        "Caption burning requires the installed DejaVu Sans font.",
      );
    });
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ryzalab-render-"));
  const published = [];
  const base = [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-threads",
    "1",
    "-filter_threads",
    "1",
    "-filter_complex_threads",
    "1",
  ];
  try {
    const plans = [];
    // Validate and stage every input before any encoding, with stable controlled filenames.
    for (const [index, scene] of media.scenes.entries()) {
      const videoFile = `source-${index}`;
      const video = await stageAsset(
        scene.sourceUrl,
        root,
        path.join(temporary, videoFile),
        VIDEO_FORMATS,
        `Scene ${index + 1}`,
      );
      const information = await probe(video, videoFile, temporary);
      const stream = information.streams.find(
        (value) => value.codec_type === "video",
      );
      if (!stream)
        throw new Error(
          `Scene ${index + 1}: source has no video or image stream.`,
        );
      if (
        !stream.width ||
        !stream.height ||
        stream.width * stream.height > 40_000_000
      )
        throw new Error(
          `Scene ${index + 1}: image dimensions exceed the safe limit.`,
        );
      if (
        video.format === "image2" &&
        !["png", "mjpeg"].includes(stream.codec_name)
      )
        throw new Error(
          `Scene ${index + 1}: expected an actual PNG or JPEG image.`,
        );
      let audio;
      if (scene.audioUrl) {
        const file = `audio-${index}`;
        const asset = await stageAsset(
          scene.audioUrl,
          root,
          path.join(temporary, file),
          AUDIO_FORMATS,
          `Scene ${index + 1} audio`,
        );
        const info = await probe(asset, file, temporary);
        if (!info.streams.some((value) => value.codec_type === "audio"))
          throw new Error(
            `Scene ${index + 1}: audio override has no audio stream.`,
          );
        audio = { asset, file };
      }
      plans.push({
        scene,
        video,
        videoFile,
        audio,
        sourceHasAudio: information.streams.some(
          (value) => value.codec_type === "audio",
        ),
        frames: Math.max(1, Math.ceil(scene.duration * FPS - 1e-8)),
      });
    }
    let renderedSeconds = 0;
    for (const [index, plan] of plans.entries()) {
      const duration = (plan.frames / FPS).toFixed(6);
      renderedSeconds += plan.frames / FPS;
      const args = [...base, ...inputArgs(plan.video, plan.videoFile)];
      let audioMap = "0:a:0";
      if (plan.audio) {
        args.push(...inputArgs(plan.audio.asset, plan.audio.file));
        audioMap = "1:a:0";
      } else if (!plan.scene.preserveAudio || !plan.sourceHasAudio) {
        args.push(
          "-f",
          "lavfi",
          "-i",
          "anullsrc=channel_layout=stereo:sample_rate=48000",
        );
        audioMap = "1:a:0";
      }
      const filter = `fps=${FPS},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,tpad=stop_mode=clone:stop_duration=${duration},format=yuv420p`;
      args.push(
        "-map",
        "0:v:0",
        "-map",
        audioMap,
        "-vf",
        filter,
        "-af",
        "aresample=48000,apad",
        "-t",
        duration,
        "-r",
        String(FPS),
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-b:a",
        "128k",
        "-map_metadata",
        "-1",
        "-threads",
        "1",
        `scene-${index}.mp4`,
      );
      await command(FFMPEG, args, temporary);
    }
    await writeFile(
      path.join(temporary, "concat.txt"),
      plans.map((_, index) => `file 'scene-${index}.mp4'`).join("\n") + "\n",
    );
    await writeFile(path.join(temporary, "captions.srt"), srt, "utf8");
    const final = [
      ...base,
      "-protocol_whitelist",
      "file,pipe",
      "-f",
      "concat",
      "-safe",
      "1",
      "-i",
      "concat.txt",
      "-map",
      "0:v:0",
      "-map",
      "0:a:0",
    ];
    if (options.captions)
      final.push(
        "-vf",
        `subtitles=filename=captions.srt:fontsdir=${FONT_DIRECTORY}:force_style='FontName=DejaVu Sans,FontSize=18,Outline=2,Alignment=2,MarginV=32'`,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
      );
    else final.push("-c:v", "copy");
    final.push(
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-b:a",
      "128k",
      "-t",
      renderedSeconds.toFixed(6),
      "-map_metadata",
      "-1",
      "-movflags",
      "+faststart",
      "-threads",
      "1",
      "render.mp4",
    );
    await command(FFMPEG, final, temporary);
    await writeFile(
      path.join(temporary, "source.json"),
      serializeProject(media),
      "utf8",
    );
    for (const [source, destination] of [
      ["render.mp4", output],
      ["captions.srt", srtOutput],
      ["source.json", sourceOutput],
    ]) {
      await copyFile(
        path.join(temporary, source),
        destination,
        constants.COPYFILE_EXCL,
      );
      published.push(destination);
    }
    return {
      output,
      srt: srtOutput,
      source: sourceOutput,
      aspect,
      width,
      height,
      duration: renderedSeconds,
      scenes: plans.length,
      captionsBurned: Boolean(options.captions),
    };
  } catch (error) {
    await Promise.all(published.map((file) => rm(file, { force: true })));
    throw error;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--captions") {
      if (options.captions) throw new Error("Duplicate --captions flag.");
      options.captions = true;
      continue;
    }
    const key = {
      "--project": "project",
      "--assets-dir": "assetsDir",
      "--output": "output",
      "--aspect": "aspect",
    }[argument];
    if (!key || !args[index + 1] || args[index + 1].startsWith("--"))
      throw new Error(`Unknown or missing argument: ${argument}.\n${help}`);
    if (options[key]) throw new Error(`Duplicate argument: ${argument}.`);
    options[key] = args[++index];
  }
  return options;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(help);
    else console.log(JSON.stringify(await renderVideo(options), null, 2));
  } catch (error) {
    console.error(`Render failed: ${error.message}`);
    process.exitCode = 1;
  }
}
