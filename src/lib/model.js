export const DOCUMENTS = [
  {
    id: "business",
    name: "사업자등록증",
    method: "자동 조회",
    issuer: "국세청 홈택스",
  },
  {
    id: "income",
    name: "소득금액증명",
    method: "자동 조회",
    issuer: "국세청 홈택스",
  },
  {
    id: "tax",
    name: "부가가치세 과세표준증명",
    method: "자동 조회",
    issuer: "국세청 홈택스",
  },
  {
    id: "lease",
    name: "임대차계약서",
    method: "직접 제출",
    issuer: "사업장 임대차 계약 원본",
  },
];

export const INITIAL_STATE = {
  businessType: "개인사업자",
  purpose: "운전자금",
  fetched: false,
  upload: null,
  checked: false,
  corrected: false,
  staffRequested: false,
  receipt: null,
};

export function reducer(state, action) {
  switch (action.type) {
    case "conditions":
      return {
        ...state,
        ...action.value,
        checked: false,
        corrected: false,
        staffRequested: false,
      };
    case "fetch":
      return {
        ...state,
        fetched: true,
        checked: false,
        corrected: false,
        staffRequested: false,
      };
    case "upload":
      return {
        ...state,
        upload: action.value,
        checked: false,
        corrected: false,
        staffRequested: false,
      };
    case "delete":
      return {
        ...state,
        upload: null,
        checked: false,
        corrected: false,
        staffRequested: false,
      };
    case "check":
      return state.upload
        ? { ...state, checked: true, corrected: false, staffRequested: false }
        : state;
    case "recheck":
      return state.upload && state.checked
        ? { ...state, corrected: true, staffRequested: false }
        : state;
    case "request":
      return state.upload && state.checked
        ? { ...state, staffRequested: true, corrected: false }
        : state;
    case "submit":
      return canSubmit(state) ? { ...state, receipt: action.value } : state;
    case "reset":
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

export function canSubmit(state) {
  return Boolean(
    state.fetched &&
    state.upload &&
    state.checked &&
    (state.corrected || state.staffRequested),
  );
}

export function getResults(state) {
  return DOCUMENTS.map((doc) => ({
    ...doc,
    status:
      doc.id === "tax"
        ? "staff"
        : doc.id === "lease"
          ? state.staffRequested
            ? "staff"
            : state.corrected
              ? "pass"
              : "fix"
          : "pass",
  }));
}

// UI validation only. A real backend must independently validate uploads.
export function validateFile(file) {
  if (!file || file.size === 0) return "내용이 없는 파일은 등록할 수 없어요.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const formats = {
    pdf: ["application/pdf"],
    png: ["image/png"],
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    webp: ["image/webp"],
  };
  if (
    !formats[extension] ||
    (file.type && !formats[extension].includes(file.type))
  )
    return "PDF, PNG, JPG, WEBP 파일을 선택해 주세요.";
  if (file.size > 20 * 1024 * 1024)
    return "시연 앱에서는 20MB 이하 파일을 등록할 수 있어요.";
  return "";
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
