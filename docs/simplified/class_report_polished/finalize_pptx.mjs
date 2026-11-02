import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
process.env.RUNTIME_NODE_MODULES='C:/Users/Zhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const skill='C:/Users/Zhang/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations';
const root=path.dirname(fileURLToPath(import.meta.url));
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({workspaceDir:path.dirname(root),candidatePath:path.join(root,'.build/candidate.pptx'),finalPath:path.join(root,'02-classdiagram-simple_polished.pptx'),pythonExecutable:'C:/Users/Zhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu',`${680*9525},${800*9525}`,'--validate-heading-fit'],explicitTotalSlideCount:1,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:['Microsoft YaHei']},verifyArtifactToolImport:true,receiptPath:path.join(root,'../.report-validation/class-validation.json')});
console.log(JSON.stringify(result));
