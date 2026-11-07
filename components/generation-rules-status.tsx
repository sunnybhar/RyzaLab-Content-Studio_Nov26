"use client";
import type { Content, StudioState } from "@/lib/studio/types";
export function GenerationRulesStatus({
  content,
  state,
}: {
  content: Content;
  state: StudioState;
}) {
  const job =
    state.jobs.find((job) => job.id === content.generatedBy?.jobId) ||
    state.jobs
      .filter((job) => job.contentId === content.id && job.kind === "text")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!job) return null;
  const context = job.agentContextSnapshot;
  let coverage:{researchSourcesIncluded:number;researchSourcesRetained:number;passagesExcerpted:number}|undefined;
  try{const value=JSON.parse(job.prompt).evidenceCoverage;if(typeof value?.researchSourcesIncluded==="number"&&typeof value?.researchSourcesRetained==="number"&&typeof value?.passagesExcerpted==="number")coverage=value;}catch{}
  let researchVersion:{fileName:string;uploadedAt:string}|undefined;
  try{const value=JSON.parse(job.prompt).researchMethodology?.resourceVersion;if(typeof value?.fileName==="string"&&typeof value?.uploadedAt==="string")researchVersion=value;}catch{}
  return (
    <details className="s-review-policy">
      <summary>Agent Rules used for this writing request</summary>
      <p>
        {content.channel} · {new Date(job.createdAt).toLocaleString()} ·{" "}
        {job.connectionSnapshot?.model || "Saved model"}
      </p>
      {context?.rules.length ? (
        <ul>
          {context.rules.map((rule) => (
            <li key={rule.id}>
              <strong>
                {rule.role === "instructions"
                  ? "Instructions / skills"
                  : "Context / knowledge"}
                :
              </strong>{" "}
              {rule.title}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          No uploaded Instructions or Context were included in this saved
          request.
        </p>
      )}
      {coverage&&<p>Research sources included: {coverage.researchSourcesIncluded}/{coverage.researchSourcesRetained}. {coverage.passagesExcerpted} passages excerpted to fit the model allowance. Full retained extracts remain in Studio; omitted passages were not used in this request.</p>}
      {researchVersion&&<p>Research Instructions used for evidence analysis: {researchVersion.fileName} · saved {new Date(researchVersion.uploadedAt).toLocaleString()}. Public discovery did not receive this private file text.</p>}
      {!!context?.voice.length && (
        <>
          <p>Voice examples included:</p>
          <ul>
            {context.voice.map((voice) => (
              <li key={voice.id}>{voice.title}</li>
            ))}
          </ul>
        </>
      )}
      <p>
        {job.systemSnapshot
          ? "The model context for this request is saved. Later Agent Rules changes do not alter this request."
          : "This older request has saved context snapshots; no exact compiled model context was recorded."}{" "}
        Context can use selected excerpts to fit the request limit. Inclusion
        does not guarantee that the AI followed every instruction.
      </p>
    </details>
  );
}
