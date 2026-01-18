export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_SIZE = 800;
export const CONFIDENCE_THRESHOLD = 0.65;
export const LOW_CONFIDENCE_THRESHOLD = 0.5;
export const AGENT_TIMEOUT_MS = 10000;
export const MAX_RETRY_ATTEMPTS = 3;
export const VALID_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const LOG_COMPONENT_GOAP_AGENT = 'goap-agent';
export const LOG_COMPONENT_VISION_SPECIALIST = 'VisionSpecialist';

export const MSG_WEBGPU_BACKEND_ACTIVE = 'WebGPU Backend Active';
export const MSG_WEBGL_BACKEND_ACTIVE = 'WebGL Backend Active';
export const MSG_CPU_BACKEND_ACTIVE = 'CPU Backend Active (Performance degraded)';
export const MSG_MODEL_LOADED_SUCCESS = 'Model Loaded Successfully';
export const MSG_FAILED_TO_LOAD_REMOTE_MODEL = 'Failed to load remote model';
export const MSG_CRITICAL_INITIALIZATION_FAILURE = 'Critical Initialization Failure';
export const MSG_VISION_MODEL_NOT_LOADED = 'Vision Model not loaded';
export const MSG_VISION_MODEL_UNAVAILABLE = 'Vision Model Unavailable - Check Network Connection';
export const MSG_NEURAL_NETWORK_INFERENCE_FAILED = 'Neural Network Inference Failed';
export const MSG_FAILED_TO_CREATE_MESHGRID = 'Failed to create meshgrid';

export const AGENT_SECURITY_AUDIT = 'SecurityAudit-Agent';
export const AGENT_ESLINT = 'ESLint-Agent';
export const AGENT_CODE_COMPLEXITY = 'CodeComplexity-Agent';
