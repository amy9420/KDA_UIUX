import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Asset,
  Button,
  Heading,
  Notice,
  Header,
  Checkbox,
  Modal,
  DocumentPreview,
} from "./components.jsx";
import {
  DOCUMENTS,
  INITIAL_STATE,
  reducer,
  getResults,
  canSubmit,
  validateFile,
  formatDate,
} from "./lib/model.js";

const TITLES = {
  intro: "AI 서류 사전점검",
  chat: "하이챗봇",
  documents: "준비 서류",
  upload: "서류 등록",
  "auto-consent": "서류 자동 조회",
  "auto-done": "조회 완료",
  files: "파일 선택",
  camera: "서류 촬영",
  results: "점검 결과",
  detail: "보완 상세",
  rechecked: "점검 결과",
  requested: "직원 확인 요청",
  review: "제출 확인",
  complete: "접수 완료",
  applications: "나의 신청",
};
const DEFAULT_BACK = {
  chat: "intro",
  documents: "chat",
  upload: "documents",
  "auto-consent": "upload",
  "auto-done": "documents",
  files: "upload",
  camera: "upload",
  results: "upload",
  detail: "results",
  rechecked: "detail",
  requested: "detail",
  review: "rechecked",
  complete: "intro",
  applications: "complete",
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [screen, setScreen] = useState(() =>
    Object.hasOwn(TITLES, location.hash.slice(1))
      ? location.hash.slice(1)
      : "intro",
  );
  const returns = useRef({});
  const previousRoute = useRef(location.hash.slice(1) || "intro");
  const [chatStage, setChatStage] = useState(0);
  const [scrollbar, setScrollbar] = useState(null);
  const scrollTimer = useRef(null),
    chatTimers = useRef([]);
  const [voiceReady, setVoiceReady] = useState(false);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoConsent, setAutoConsent] = useState(false);
  const [submitConsent, setSubmitConsent] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [uploadPurpose, setUploadPurpose] = useState("initial");
  const main = useRef(null),
    picker = useRef(null),
    capture = useRef(null),
    busyRef = useRef(false),
    uploadUrl = useRef(null),
    timer = useRef(null);
  const go = useCallback((to) => {
    if (Object.hasOwn(TITLES, to)) {
      const from = location.hash.slice(1) || "intro";
      if (["files", "auto-consent", "camera"].includes(to) && from !== to)
        returns.current[to] = from;
      location.hash = to;
    }
  }, []);
  const closeModal = useCallback(() => setModal(null), []);
  useEffect(() => {
    function changed() {
      const next = location.hash.slice(1);
      if (
        next === "chat" &&
        !["chat", "files", "camera"].includes(previousRoute.current)
      ) {
        chatTimers.current.forEach(clearTimeout);
        chatTimers.current = [];
        setChatStage(0);
        setMessages([]);
        setQuery("");
      }
      previousRoute.current = next || "intro";
      setScreen(Object.hasOwn(TITLES, next) ? next : "intro");
      setError("");
      setModal(null);
    }
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    main.current?.scrollTo(0, 0);
    setToast("");
    setScrollbar(null);
    document.title = `${TITLES[screen]} | 하나원큐 시연`;
  }, [screen]);
  useEffect(
    () => () => {
      if (uploadUrl.current) URL.revokeObjectURL(uploadUrl.current);
      clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const back = () =>
    go(returns.current[screen] || DEFAULT_BACK[screen] || "intro");
  useEffect(() => {
    if (screen !== "chat" || chatStage >= 3) return;
    const timers = [
      setTimeout(() => setChatStage(1), 300),
      setTimeout(() => setChatStage(2), 1200),
      setTimeout(() => setChatStage(3), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [screen]);
  useEffect(() => {
    if (screen !== "chat") return;
    requestAnimationFrame(() =>
      main.current?.scrollTo({
        top: main.current.scrollHeight,
        behavior: "smooth",
      }),
    );
  }, [messages, chatStage]);
  useEffect(
    () => () => {
      chatTimers.current.forEach(clearTimeout);
      clearTimeout(scrollTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (modal?.type !== "voice") return;
    setVoiceReady(false);
    const t = setTimeout(() => setVoiceReady(true), 1800);
    return () => clearTimeout(t);
  }, [modal?.type]);
  const showScroll = () => {
    const el = main.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    const height = Math.max(
      25,
      (el.clientHeight * el.clientHeight) / el.scrollHeight,
    );
    setScrollbar({
      height,
      top:
        (el.scrollTop / (el.scrollHeight - el.clientHeight)) *
        (el.clientHeight - height),
    });
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => setScrollbar(null), 800);
  };
  const register = (file, sample = false) => {
    const message = sample ? "" : validateFile(file);
    if (message) {
      setError(message);
      setModal(null);
      return;
    }
    if (uploadUrl.current) URL.revokeObjectURL(uploadUrl.current);
    const url = sample ? null : URL.createObjectURL(file);
    const fileType = sample
      ? "application/pdf"
      : file.type ||
        {
          pdf: "application/pdf",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          webp: "image/webp",
        }[file.name.split(".").pop().toLowerCase()];
    uploadUrl.current = url;
    dispatch({
      type: "upload",
      value: {
        name: sample ? "임대차계약서.pdf" : file.name,
        type: fileType,
        url,
        sample,
      },
    });
    setPage(1);
    setError("");
    setModal(null);
    go("upload");
    // A replacement must be checked again; the sample result is explicitly simulated.
    setToast(
      uploadPurpose === "correction"
        ? "보완 파일을 등록했어요. 다시 점검해 주세요."
        : "파일이 등록되었어요.",
    );
  };
  const chooseFile = (purpose = "initial") => {
    setUploadPurpose(purpose);
    setError("");
    go("files");
  };
  const run = (action) => {
    if (busyRef.current) return;
    if (action === "fetch" && !autoConsent) return;
    if (
      (action === "check" || action === "recheck") &&
      (!state.upload || !state.fetched)
    ) {
      setError("자동 조회와 임대차계약서 등록을 먼저 완료해 주세요.");
      return;
    }
    if (action === "submit" && (!submitConsent || !canSubmit(state))) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    timer.current = setTimeout(() => {
      if (action === "fetch") {
        dispatch({ type: "fetch" });
        go("auto-done");
      }
      if (action === "check") {
        dispatch({ type: "check" });
        if (uploadPurpose === "correction") {
          dispatch({ type: "recheck" });
          go("rechecked");
        } else go("results");
      }
      if (action === "recheck") {
        dispatch({ type: "recheck" });
        go("rechecked");
      }
      if (action === "submit") {
        if (!state.receipt)
          dispatch({
            type: "submit",
            value: {
              id: `DEMO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
              date: new Date().toISOString(),
            },
          });
        go("complete");
      }
      setBusy(false);
      busyRef.current = false;
    }, 700);
  };
  const results = getResults(state);
  const staffCount = results.filter((d) => d.status === "staff").length;
  const passCount = results.filter((d) => d.status === "pass").length;
  const enterReview = () => {
    setSubmitConsent(false);
    go("review");
  };
  const sendMessage = (e) => {
    if (typeof e !== "string") e.preventDefault();
    if (typeof e !== "string" && !query.trim()) return;
    const text = typeof e === "string" ? e : query.trim();
    const reply = /공동/.test(text)
      ? "공동대표인 경우 대표자 확인과 추가 동의 서류가 필요할 수 있어요. 정확한 추가 서류는 신청 상품과 대표 방식에 따라 담당자에게 확인해 주세요."
      : /확정/.test(text)
        ? "임대차계약서의 확정일자 필요 여부는 신청 상품과 계약 조건에 따라 달라져요. 계약서의 임대차 기간과 서명을 먼저 확인하고 담당자에게 인정 기준을 문의해 주세요."
        : /서류|준비/.test(text)
          ? "기업 형태와 자금 용도를 확인한 뒤 맞춤 준비 서류를 확인해 주세요. 실제 제출 요건은 신청 상품에 따라 달라질 수 있어요."
          : "이 화면은 기업대출 서류 준비를 안내하는 시연용 챗봇이에요. 기업 형태와 자금 용도를 선택해 주세요.";
    const id = crypto.randomUUID();
    setMessages((m) => [...m, { id, user: text, reply: null }]);
    chatTimers.current.push(
      setTimeout(
        () =>
          setMessages((m) =>
            m.map((item) => (item.id === id ? { ...item, reply } : item)),
          ),
        850,
      ),
    );
    setQuery("");
    requestAnimationFrame(() =>
      main.current?.scrollTo({
        top: main.current.scrollHeight,
        behavior: "smooth",
      }),
    );
  };

  function renderScreen() {
    switch (screen) {
      case "intro":
        return (
          <div className="intro page">
            <div className="brand-pill">
              <Asset name="imgIcon2" />
              Hana AI 서류 검증 솔루션
            </div>
            <Heading description="영업점 방문 전, 필요한 서류를 확인하세요.">
              기업대출 서류,
              <br />
              제출 전에 확인하세요
            </Heading>
            <div className="intro-card">
              <Asset name="imgIcon" />
              <div>
                <strong>간편 사전점검 안내</strong>
                <p>서류 촬영 또는 파일 첨부로 간편하게 확인</p>
              </div>
            </div>
            <ol className="steps">
              {[
                [
                  "필요한 서류 안내",
                  "사업 형태와 자금 용도에 맞는 필수 서류를 바로 확인",
                ],
                ["누락과 오류 확인", "글자 번짐, 필수 기재란 확인"],
                ["보완 후 담당자 전달", "확인을 마친 서류를 안전하게 전송"],
              ].map(([title, text], i) => (
                <li key={title}>
                  <span>{`0${i + 1}`}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Notice>
              서류 제출을 돕는 사전 점검 서비스로 대출가능 여부를 확정짓지
              않아요.
            </Notice>
            <div className="actions">
              <Button arrow onClick={() => go("chat")}>
                서류 준비 시작하기
              </Button>
              <button className="chat-link" onClick={() => go("chat")}>
                <Asset name="imgContainer1" />
                하이챗봇에 물어보기
              </button>
            </div>
          </div>
        );

      case "chat":
        return (
          <div className="chat-page page">
            <h1>
              김하나 고객님 안녕하세요.
              <br />
              기업 서류 준비를 도와드릴게요.
            </h1>
            {chatStage >= 1 && (
              <div className="bot-message message-enter">
                <div className="bot-avatar">하이</div>
                <div>
                  <span className="bot-name">하이봇</span>
                  <div className="bubble">
                    어떤 사업을 운영 중이신가요? 조건에 맞춰 꼭 필요한 서류
                    목록을 정리해 드릴게요.
                  </div>
                  <small>오전 09:42</small>
                </div>
              </div>
            )}
            {chatStage >= 2 && (
              <>
                <div className="user-message message-enter">
                  {state.businessType}이고{" "}
                  {state.purpose === "운전자금" ? "가게 운영자금" : "시설자금"}
                  이 필요해요
                </div>
                <p className="message-time">읽음　오전 09:42</p>
              </>
            )}
            {chatStage >= 3 && (
              <>
                <div className="bot-message message-enter">
                  <div className="bot-avatar">하이</div>
                  <div className="bot-column">
                    <span className="bot-name">하이봇</span>
                    <div className="bubble conditions">
                      <p>
                        기업 형태와 자금 용도를 선택하시면
                        <br />더 정확해요.
                      </p>
                      <fieldset>
                        <legend>기업 형태</legend>
                        {["개인사업자", "법인사업자"].map((type) => (
                          <button
                            key={type}
                            className={`chip ${state.businessType === type ? "selected" : ""}`}
                            aria-pressed={state.businessType === type}
                            onClick={() =>
                              dispatch({
                                type: "conditions",
                                value: { businessType: type },
                              })
                            }
                          >
                            {type}
                          </button>
                        ))}
                      </fieldset>
                      <fieldset>
                        <legend>자금 용도</legend>
                        {["운전자금", "시설자금"].map((purpose) => (
                          <button
                            key={purpose}
                            className={`chip ${state.purpose === purpose ? "selected" : ""}`}
                            aria-pressed={state.purpose === purpose}
                            onClick={() =>
                              dispatch({
                                type: "conditions",
                                value: { purpose },
                              })
                            }
                          >
                            {purpose}
                          </button>
                        ))}
                      </fieldset>
                      <div className="chat-result">
                        <div className="chat-result-title">
                          <Asset screen="225:4625" name="imgIcon4" />
                          <div>
                            <strong>맞춤 서류 진단 완료</strong>
                            <p>
                              {state.businessType} {state.purpose} 맞춤 서류가
                              준비되었어요.
                            </p>
                          </div>
                        </div>
                        <div className="document-chips">
                          {DOCUMENTS.map((d) => (
                            <span key={d.id}>
                              <Asset screen="225:4625" name="imgIcon2" />
                              {d.name}
                            </span>
                          ))}
                        </div>
                        <Button onClick={() => go("documents")}>
                          맞춤 준비 서류 보기{" "}
                          <Asset screen="225:4625" name="imgIcon3" />
                        </Button>
                      </div>
                    </div>
                    <small>오전 09:43</small>
                  </div>
                </div>
                <div className="suggestions">
                  <p>
                    <Asset screen="225:4625" name="imgIcon1" />
                    자주 묻는 질문 추천
                  </p>
                  {[
                    "공동대표인 경우 필요한 서류는?",
                    "임대차계약서 확정일자가 필요한가요?",
                  ].map((question) => (
                    <button
                      key={question}
                      onClick={() => sendMessage(question)}
                    >
                      {question}
                      <Asset screen="225:4625" name="imgIcon" />
                    </button>
                  ))}
                </div>
              </>
            )}
            {messages.map((m, i) => (
              <div className="extra-message" key={i}>
                <div className="user-message">{m.user}</div>
                <div className="bubble message-enter">
                  {m.reply || (
                    <span className="typing" aria-label="하이봇이 답변 중">
                      ● ● ●
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case "documents":
        return (
          <div className="page documents-page">
            <Heading>
              필요한 서류를
              <br />
              확인해 주세요
            </Heading>
            <div className="smart-summary">
              <div className="robot-badge">
                <Asset screen="225:4400" name="imgContainer7" />
              </div>
              <div>
                <strong>HAI 스마트 서류 점검</strong>
                <p>
                  {state.fetched
                    ? "홈택스 연동 서류 3종이 확인되었습니다."
                    : "맞춤 준비 서류를 안내해 드려요."}
                </p>
              </div>
              <b>
                {Number(state.fetched) * 3 + Number(Boolean(state.upload))}건
                확인됨
              </b>
            </div>
            <div className="document-list">
              {DOCUMENTS.map((d, i) => {
                const done =
                  d.id === "lease" ? Boolean(state.upload) : state.fetched;
                return (
                  <article className="document-card" key={d.id}>
                    <div className="document-symbol">
                      <Asset
                        screen="225:4400"
                        name={
                          i < 2
                            ? "imgContainer3"
                            : i === 2
                              ? "imgContainer5"
                              : "imgContainer6"
                        }
                      />
                    </div>
                    <div className="document-card-content">
                      <div className="document-card-title">
                        <h3>{d.name}</h3>
                        <span className={`tag ${done ? "success" : ""}`}>
                          {done ? "등록 완료" : "미제출"}
                        </span>
                        <span
                          className={`tag ${d.id === "lease" ? "outlined" : ""}`}
                        >
                          {d.method}
                        </span>
                      </div>
                      <div className="document-meta">
                        <span>발급처: {d.issuer}</span>
                        <button
                          className="text-link"
                          onClick={() =>
                            d.id === "lease" ? go("upload") : go("auto-consent")
                          }
                        >
                          {done
                            ? "조회 확인"
                            : d.id === "lease"
                              ? "촬영/파일 첨부"
                              : "추가 조회"}
                        </button>
                      </div>
                      <button
                        className="row-link"
                        onClick={() => setModal({ type: "info", doc: d })}
                      >
                        상품별 인정기준 확인
                        <Asset screen="225:4400" name="imgContainer4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <button
              className="smart-summary camera-guide"
              onClick={() => setModal({ type: "guide" })}
            >
              <Asset screen="225:4400" name="imgContainer1" />
              <span>
                <strong>스마트 촬영 가이드</strong>
                <small>모서리가 선명하고 빛 반사가 없어야 합니다.</small>
              </span>
              <Asset screen="225:4400" name="imgContainer2" />
            </button>
            <Button
              arrow
              onClick={() => go(state.fetched ? "upload" : "auto-consent")}
            >
              서류 준비하기
            </Button>
          </div>
        );

      case "auto-consent":
        return (
          <div className="page simple-page">
            <Heading
              eyebrow="자동 조회"
              description="조회할 자료와 이용 목적을 확인해 주세요."
            >
              서류를 한 번에
              <br />
              불러올 수 있어요
            </Heading>
            <section className="soft-card auto-docs">
              <h3>조회할 자료</h3>
              <ul>
                {DOCUMENTS.slice(0, 3).map((d) => (
                  <li key={d.id}>{d.name}</li>
                ))}
              </ul>
            </section>
            <p className="auto-purpose">
              이용 목적　기업대출 서류 사전점검
              <br />
              전달 범위　조회 자료와 점검 결과
            </p>
            <div className="bottom-content">
              <Checkbox
                id="auto-consent"
                checked={autoConsent}
                onChange={setAutoConsent}
              >
                자료 조회와 이용에 동의합니다
              </Checkbox>
              <Button secondary onClick={() => go("upload")}>
                직접 제출로 변경
              </Button>
              <Button
                disabled={!autoConsent || busy}
                busy={busy}
                onClick={() => run("fetch")}
              >
                {busy ? "서류를 불러오고 있어요" : "서류 불러오기"}
              </Button>
            </div>
          </div>
        );

      case "auto-done":
        return (
          <div className="page simple-page">
            {state.fetched ? (
              <>
                <div className="plain-check">✓</div>
                <Heading description="조회한 자료는 제출 전에 확인할 수 있어요.">
                  서류 3건을 불러왔어요
                </Heading>
                <div className="stack">
                  {DOCUMENTS.slice(0, 3).map((d) => (
                    <div className="soft-card result-line" key={d.id}>
                      <span>{d.name}</span>
                      <small className="green">조회 완료</small>
                    </div>
                  ))}
                </div>
                <p className="space-top">임대차계약서는 직접 등록해 주세요.</p>
                <div className="bottom-content">
                  <Button onClick={() => go("upload")}>
                    임대차계약서 등록하기
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                text="아직 조회한 자료가 없어요."
                action="서류 조회하기"
                onClick={() => go("auto-consent")}
              />
            )}
          </div>
        );

      case "upload":
        return (
          <div className="page upload-page">
            <div className="tabs" role="tablist" aria-label="서류 제출 방식">
              <button
                role="tab"
                aria-selected="false"
                onClick={() => go("auto-consent")}
              >
                자동 조회
              </button>
              <button role="tab" aria-selected="true">
                직접 제출
              </button>
            </div>
            <Heading description="서명이 선명한 원본 또는 스캔본이어야 합니다.">
              임대차계약서 파일을
              <br />
              등록해 주세요
            </Heading>
            <button
              className="text-link small"
              onClick={() => setModal({ type: "info", doc: DOCUMENTS[3] })}
            >
              상품별 인정기준 확인 &gt;
            </button>
            <div className="upload-choices">
              <Button
                secondary
                onClick={() => {
                  setUploadPurpose(state.checked ? "correction" : "initial");
                  go("camera");
                }}
              >
                <Asset screen="225:4557" name="imgIcon4" />
                사진 촬영
              </Button>
              <Button
                secondary
                onClick={() =>
                  chooseFile(state.checked ? "correction" : "initial")
                }
              >
                <Asset screen="225:4557" name="imgIcon3" />
                파일 선택
              </Button>
            </div>
            {state.upload ? (
              <section className="upload-card">
                <div className="file-heading">
                  <span className="pdf-badge">
                    <Asset screen="225:4557" name="imgIcon2" />
                  </span>
                  <div>
                    <strong>{state.upload.name}</strong>
                    <small>
                      {state.upload.sample
                        ? "총 3페이지"
                        : state.upload.type?.startsWith("image/")
                          ? "사진 1장"
                          : "PDF 문서"}{" "}
                      · <span className="green">등록 완료</span>
                    </small>
                  </div>
                  <button
                    onClick={() =>
                      chooseFile(state.checked ? "correction" : "initial")
                    }
                  >
                    교체
                  </button>
                  <button onClick={() => setModal({ type: "delete" })}>
                    삭제
                  </button>
                </div>
                <p className="preview-caption">미리보기</p>
                <DocumentPreview
                  upload={state.upload}
                  selectedPage={page}
                  onPageChange={setPage}
                  onEnlarge={() => setModal({ type: "preview" })}
                />
              </section>
            ) : (
              <div className="empty-upload">
                <strong>아직 등록한 서류가 없어요.</strong>
                <p>사진 촬영 또는 파일 선택으로 등록해 주세요.</p>
              </div>
            )}
            <Notice>파일을 확인한 뒤 점검을 시작해 주세요.</Notice>
            {!state.fetched && (
              <section className="fetch-reminder">
                <h3>
                  <Asset screen="225:4557" name="imgIcon" />
                  국세청 연계 자동 조회
                </h3>
                <p>제출에 필요한 자료 3건을 먼저 불러와 주세요.</p>
                <Button secondary onClick={() => go("auto-consent")}>
                  자동 조회하러 가기
                </Button>
              </section>
            )}
            <p className="upload-policy">
              시연 앱 지원 형식: PDF, PNG, JPG, WEBP / 20MB 이하
            </p>
            <Button
              arrow
              disabled={!state.upload || !state.fetched || busy}
              busy={busy}
              onClick={() => run("check")}
            >
              {busy
                ? "서류를 점검하고 있어요"
                : uploadPurpose === "correction"
                  ? "보완 서류 점검하기"
                  : "서류 점검하기"}
            </Button>
          </div>
        );

      case "files":
        return (
          <div className="page simple-page">
            <Heading>
              제출할 파일을
              <br />
              선택해 주세요
            </Heading>
            <p className="section-label">최근 파일</p>
            <button
              className="soft-card sample-file"
              onClick={() => register(null, true)}
            >
              <b className="green">PDF</b>
              <strong>임대차계약서.pdf</strong>
              <small>3페이지 / 시연용 샘플</small>
            </button>
            <p className="description space-top">
              시연용 파일을 선택하면 미리보기로 이동해요.
            </p>
            <Button secondary onClick={() => picker.current.click()}>
              내 기기에서 파일 선택
            </Button>
            <div className="bottom-content">
              <Button secondary onClick={back}>
                취소
              </Button>
            </div>
          </div>
        );

      case "camera":
        return (
          <div className="camera-page">
            <p>서류가 테두리 안에 들어오게 맞춰 주세요.</p>
            <div className="camera-document">
              <h2>부동산 임대차계약서</h2>
              <p>
                임대인 / 임차인
                <br />
                <br />
                소재지
                <br />
                <br />
                임대차 기간
                <br />
                <br />
                계약 내용
                <br />
                <br />
                서명
              </p>
            </div>
            <div className="camera-actions">
              <Button onClick={() => register(null, true)}>
                촬영하고 미리보기
              </Button>
              <button onClick={() => capture.current.click()}>
                기기 카메라 / 사진 선택
              </button>
              <small>현재 문서는 시연용 샘플입니다.</small>
            </div>
          </div>
        );

      case "results":
        return state.checked ? (
          <div className="page results-page">
            <Heading>
              서류 1건을
              <br />
              보완해 주세요
            </Heading>
            <Summary pass={2} fix={1} staff={1} />
            <div className="section-label">
              제출 서류 진단 리스트 <small>총 4건 접수</small>
            </div>
            <ResultCards results={results} onDetail={() => go("detail")} />
            <Notice>
              <strong>스마트 서류 재촬영 팁</strong>
              <br />
              그림자가 생기지 않도록 밝은 곳에서 촬영해 주세요.
            </Notice>

            <Button arrow onClick={() => go("detail")}>
              보완 서류 확인
            </Button>
          </div>
        ) : (
          <EmptyState
            text="점검한 서류가 없어요."
            action="서류 등록하기"
            onClick={() => go("upload")}
          />
        );

      case "detail":
        return state.checked ? (
          <div className="page detail-page">
            <p className="eyebrow issue">
              <Asset screen="225:4249" name="imgIcon6" />
              2페이지 계약기간 항목
            </p>
            <Heading>
              임대차 기간을
              <br />
              읽기 어려워요
            </Heading>
            <div
              className="large-document"
              onClick={() => setModal({ type: "preview" })}
              role="button"
              tabIndex={0}
              aria-label="계약서 원문 크게 보기"
              onKeyDown={(e) =>
                e.key === "Enter" && setModal({ type: "preview" })
              }
            >
              <div className="document-page-title">
                <Asset screen="225:4249" name="imgIcon5" />
                부동산 임대차계약서{" "}
                <small>
                  {state.upload?.sample ? "Page 2 / 3" : "시연 점검 위치"}
                </small>
              </div>
              <DocumentPreview upload={state.upload} selectedPage={2} large />
              <span className="issue-marker">
                <Asset screen="225:4249" name="imgIcon4" />
                글자 흐림 감지
              </span>
              <small>터치하면 원본 이미지를 크게 볼 수 있어요</small>
            </div>
            <div className="repair-guide">
              <Asset screen="225:4249" name="imgIcon2" />
              <div>
                <h3>이렇게 수정해 주세요</h3>
                <p>
                  빛 반사 없이 페이지 전체가 나오도록 수평을 맞춰 다시 촬영해
                  주세요.
                </p>
              </div>
            </div>
            <Button
              secondary
              onClick={() => {
                setUploadPurpose("correction");
                go("camera");
              }}
            >
              <Asset screen="225:4249" name="imgIcon1" />
              다시 촬영하기
            </Button>
            <div className="inline-actions">
              <button onClick={() => chooseFile("correction")}>
                파일 교체
              </button>
              <span>|</span>
              <button onClick={() => setModal({ type: "staff" })}>
                직원에게 확인 요청
              </button>
            </div>
            <Button
              arrow
              disabled={busy}
              busy={busy}
              onClick={() => run("recheck")}
            >
              {busy ? "다시 점검하고 있어요" : "다시 점검하기"}
            </Button>
            <p className="disclaimer">
              재점검은 수정된 샘플 결과를 보여주는 시연입니다.
            </p>
          </div>
        ) : (
          <EmptyState
            text="보완할 서류가 없어요."
            action="서류 등록하기"
            onClick={() => go("upload")}
          />
        );

      case "rechecked":
        return state.corrected ? (
          <div className="page results-page rechecked-page">
            <Heading eyebrow="재점검 완료">
              보완한 서류가
              <br />
              정상 확인되었어요
            </Heading>
            <Summary pass={3} staff={1} />
            <div className="section-label">
              제출 서류 진단 리스트 <small>총 4건 접수</small>
            </div>
            <ResultCards results={results} />
            <Notice>
              확인이 필요한 항목은 담당자에게 전달돼요.
              <br />
              사전점검은 대출 승인을 의미하지 않습니다.
            </Notice>
            <div className="bottom-content">
              <Button onClick={enterReview}>제출 내용 확인하기</Button>
            </div>
          </div>
        ) : (
          <EmptyState
            text="재점검한 서류가 없어요."
            action="점검 결과 보기"
            onClick={() => go("results")}
          />
        );

      case "requested":
        return state.staffRequested ? (
          <div className="page simple-page">
            <div className="plain-check">✓</div>
            <Heading description="임대차계약서의 판독이 어려운 부분을 담당자가 확인하도록 전달할 수 있어요.">
              직원 확인 항목을
              <br />
              추가했어요
            </Heading>
            <div className="soft-card space-top">
              <h3>확인 요청 서류</h3>
              <p>임대차계약서</p>
            </div>
            <p className="description space-top">
              최종 제출 전까지 요청 내용을 변경할 수 있어요.
            </p>
            <div className="bottom-content">
              <Button onClick={enterReview}>제출 내용 확인하기</Button>
            </div>
          </div>
        ) : (
          <EmptyState
            text="직원 확인을 요청한 내역이 없어요."
            action="점검 결과 보기"
            onClick={() => go("results")}
          />
        );

      case "review":
        return canSubmit(state) ? (
          <div className="page review-page">
            <Heading description="영업점 담당자가 전달받은 서류로 신속하게 심사를 준비합니다.">
              담당자에게 서류를
              <br />
              전달할까요?
            </Heading>
            <div className="review-status">
              <Asset screen="225:4167" name="imgIcon6" />
              <div>
                <small>서류 취합 상태</small>
                <strong>
                  통과 {passCount}건 <span>· 직원 확인 {staffCount}건</span>
                </strong>
              </div>
              <b>총 4건</b>
            </div>
            <details className="accordion" open>
              <summary>
                제출 서류 (4건)
                <Asset screen="225:4167" name="imgIcon4" />
              </summary>
              <div className="review-documents">
                {results.map((d) => (
                  <div key={d.id}>
                    <Asset
                      screen="225:4167"
                      name={d.status === "staff" ? "imgIcon3" : "imgIcon2"}
                    />
                    <span>{d.name}</span>
                    <small className={d.status === "staff" ? "" : "green"}>
                      {d.status === "staff" ? "직원 검토" : "자동 적합"}
                    </small>
                  </div>
                ))}
              </div>
            </details>
            <details className="accordion">
              <summary>
                점검 결과 요약
                <Asset screen="225:4167" name="imgIcon1" />
              </summary>
              <p>
                통과 {passCount}건, 직원 확인 {staffCount}건입니다. 담당자가
                원문과 점검 사유를 확인해요.
              </p>
            </details>
            <details className="accordion">
              <summary>
                보완 이력
                <Asset screen="225:4167" name="imgIcon1" />
              </summary>
              <p>
                {state.staffRequested
                  ? "임대차계약서 판독 항목에 직원 확인을 요청했어요."
                  : "임대차계약서 보완 후 재점검을 완료했어요."}
              </p>
            </details>
            <Checkbox
              id="submit-consent"
              checked={submitConsent}
              onChange={setSubmitConsent}
            >
              (필수) 서류와 점검 결과를 담당자에게 전달하는 데 동의합니다.
            </Checkbox>
            <button
              className="text-link small consent-detail"
              onClick={() => setModal({ type: "consent" })}
            >
              동의 내용 자세히 보기
            </button>
            <p className="disclaimer">
              사전점검은 대출 승인을 의미하지 않습니다.
            </p>
            <Button
              disabled={!submitConsent || busy}
              busy={busy}
              onClick={() => run("submit")}
            >
              {busy ? "서류를 전달하고 있어요" : "담당자에게 제출하기"}
            </Button>
          </div>
        ) : (
          <EmptyState
            text="서류 점검과 보완을 먼저 완료해 주세요."
            action="서류 등록하기"
            onClick={() => go("upload")}
          />
        );

      case "complete":
        return state.receipt ? (
          <div className="page complete-page">
            <div className="completion-symbol">
              <Asset screen="225:4060" name="imgIcon" />
            </div>
            <Heading description="담당자가 서류를 확인한 뒤 연락드려요">
              서류가 전달되었어요
            </Heading>
            <div className="receipt-progress">
              <span className="green">
                <Asset screen="225:4060" name="imgIcon6" />
                접수 완료
              </span>
              <i />
              <span>
                <Asset screen="225:4322" name="imgIcon7" />
                담당 검토
              </span>
              <i />
              <span>
                <Asset screen="225:4060" name="imgIcon5" />
                결과 안내
              </span>
            </div>
            <section className="receipt">
              <div className="receipt-title">
                <h3>
                  <Asset screen="225:4060" name="imgIcon4" />
                  신청 세부 내역
                </h3>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(state.receipt.id);
                      setToast("접수번호를 복사했어요.");
                    } catch {
                      setModal({ type: "copy" });
                    }
                  }}
                >
                  <Asset screen="225:4060" name="imgIcon3" />
                  복사
                </button>
              </div>
              <dl>
                <dt>접수번호</dt>
                <dd>{state.receipt.id}</dd>
                <dt>신청 구분</dt>
                <dd>기업대출 서류 사전점검</dd>
                <dt>접수 일시</dt>
                <dd>{formatDate(new Date(state.receipt.date))}</dd>
                <dt>처리 상태</dt>
                <dd>
                  <span className="tag success">직원 검토 대기</span>
                </dd>
              </dl>
            </section>
            <Notice>
              <strong>추가 서류가 필요하면 알려드릴게요</strong>
              <br />
              심사 진행 중 미비한 서류가 발생할 경우 하나원큐 알림톡으로
              신속하게 안내해 드립니다.
            </Notice>
            <Button onClick={() => go("applications")}>나의 신청 확인</Button>
            <button className="chat-link" onClick={() => go("chat")}>
              <Asset screen="225:4060" name="imgIcon1" />
              하이챗봇 문의
            </button>
          </div>
        ) : (
          <EmptyState
            text="접수한 신청이 없어요."
            action="서류 준비 시작하기"
            onClick={() => go("intro")}
          />
        );

      case "applications":
        return (
          <div className="page simple-page">
            <Heading>
              신청 진행 상황을
              <br />
              확인해 보세요
            </Heading>
            {state.receipt ? (
              <>
                <div className="soft-card application-card">
                  <h3>기업대출 서류 사전점검</h3>
                  <strong className="green">직원 검토 대기</strong>
                  <small>접수번호　{state.receipt.id}</small>
                  <p>
                    제출 서류 4건
                    <br />
                    추가 요청이 있으면 이곳에서 확인할 수 있어요.
                  </p>
                </div>
                <Button secondary onClick={() => go("complete")}>
                  제출 내역 보기
                </Button>
                <p className="description space-top">
                  추가 서류가 필요하면 알려드릴게요.
                </p>
              </>
            ) : (
              <EmptyState
                text="아직 신청 내역이 없어요."
                action="서류 준비 시작하기"
                onClick={() => go("intro")}
              />
            )}
            <div className="bottom-content">
              <Button onClick={() => go("chat")}>하이챗봇 문의</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="app-shell" data-screen={screen}>
      <div className="application" inert={modal ? true : undefined}>
        <Header
          title={TITLES[screen]}
          chat={screen === "chat"}
          onBack={back}
          onChat={() => go("chat")}
          onClose={
            screen !== "intro"
              ? ["files", "auto-consent", "camera"].includes(screen)
                ? back
                : () => go("intro")
              : undefined
          }
        />
        <main
          className="app-main"
          onScroll={showScroll}
          onWheel={showScroll}
          onTouchMove={showScroll}
          ref={main}
          id="main-content"
          aria-label={TITLES[screen]}
          aria-busy={busy}
        >
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {renderScreen()}
        </main>
        {screen === "chat" && (
          <form className="chat-input" onSubmit={sendMessage}>
            <button
              type="button"
              className="icon-button"
              aria-label="서류 첨부"
              onClick={() => chooseFile()}
            >
              <Asset screen="225:4625" name="imgContainer" />
            </button>
            <input
              aria-label="챗봇 메시지"
              placeholder="궁금한 사항을 입력해 주세요"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              className="icon-button send"
              type={query.trim() ? "submit" : "button"}
              aria-label={query.trim() ? "메시지 보내기" : "음성 입력"}
              onClick={() => {
                if (!query.trim()) setModal({ type: "voice" });
              }}
            >
              {query.trim() ? (
                <span aria-hidden="true">↑</span>
              ) : (
                <Asset screen="225:4625" name="imgContainer1" />
              )}
            </button>
          </form>
        )}
      </div>
      {scrollbar && (
        <div className="scroll-indicator" aria-hidden="true">
          <span
            style={{
              height: scrollbar.height,
              transform: `translateY(${scrollbar.top}px)`,
            }}
          />
        </div>
      )}
      <input
        className="sr-only"
        ref={picker}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        aria-label="서류 파일"
        onChange={(e) => {
          if (e.target.files[0]) register(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <input
        className="sr-only"
        ref={capture}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="서류 사진"
        onChange={(e) => {
          if (e.target.files[0]) register(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
      {modal && (
        <Modal
          title={modalTitle(modal)}
          onClose={closeModal}
          compact={["delete", "staff", "consent", "copy"].includes(modal.type)}
          actions={
            modal.type === "delete" ? (
              <>
                <Button
                  onClick={() => {
                    dispatch({ type: "delete" });
                    setModal(null);
                    setToast("파일을 삭제했어요.");
                  }}
                >
                  삭제하기
                </Button>
                <Button secondary onClick={closeModal}>
                  취소
                </Button>
              </>
            ) : modal.type === "staff" ? (
              <>
                <Button
                  onClick={() => {
                    dispatch({ type: "request" });
                    setModal(null);
                    go("requested");
                  }}
                >
                  확인 요청하기
                </Button>
                <Button secondary onClick={closeModal}>
                  취소
                </Button>
              </>
            ) : (
              <Button onClick={closeModal}>확인</Button>
            )
          }
        >
          {modal.type === "delete" && (
            <p>
              {state.upload?.name}가 목록에서 삭제돼요.
              <br />
              서류를 다시 등록한 후 점검할 수 있어요.
            </p>
          )}
          {modal.type === "staff" && (
            <>
              <p>
                임대차계약서의 판독이 어려운 항목을
                <br />
                담당자가 원문으로 확인해요.
              </p>
              <div className="soft-card">
                <strong>전달 자료</strong>
                <p>원본 서류와 점검 사유</p>
              </div>
            </>
          )}
          {modal.type === "info" && (
            <>
              <h3>{modal.doc.name}</h3>
              <h4>확인할 항목</h4>
              <ul>
                {(modal.doc.id === "lease"
                  ? [
                      "계약 당사자와 사업장 주소",
                      "임대차 기간과 서명",
                      "페이지 누락 여부",
                    ]
                  : [
                      "신청 기업 정보 일치 여부",
                      "상품별 발급 기준과 대상 기간",
                      "서류 누락 여부",
                    ]
                ).map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              <h4>준비 방법</h4>
              <p>
                {modal.doc.id === "lease"
                  ? "보유한 계약서 원본을 촬영하거나 파일로 등록해요."
                  : `${modal.doc.issuer}에서 확인하거나 자동 조회를 이용해 주세요.`}
                <br />
                구체적인 인정 기준은 신청 상품에 따라 달라져요.
              </p>
            </>
          )}
          {modal.type === "guide" && (
            <>
              <p>밝은 곳에서 서류 전체가 보이도록 촬영해 주세요.</p>
              <ul>
                <li>서류 네 모서리를 모두 포함해 주세요.</li>
                <li>빛 반사와 그림자를 피해 주세요.</li>
                <li>여러 페이지라면 빠짐없이 등록해 주세요.</li>
              </ul>
            </>
          )}
          {modal.type === "faq" && (
            <p>
              추가 서류와 계약서 인정 기준은 상품과 신청 상황에 따라 달라져요.
              서류 안내를 확인하거나 담당자에게 문의해 주세요.
            </p>
          )}
          {modal.type === "consent" && (
            <>
              <p>
                기업대출 서류 사전점검을 위해 제출 서류, 추출 정보, 점검 결과와
                보완 이력을 담당자에게 전달합니다.
              </p>
              <p>
                이 프로토타입은 시연용이며 자료가 은행이나 외부 AI로 전송되지
                않습니다.
              </p>
            </>
          )}
          {modal.type === "preview" && (
            <DocumentPreview upload={state.upload} selectedPage={page} large />
          )}
          {modal.type === "voice" && (
            <div className="voice-demo">
              <div className="voice-orb">
                <Asset screen="225:4625" name="imgContainer1" />
              </div>
              <div className="voice-wave" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <i key={n} style={{ animationDelay: `${n * 0.12}s` }} />
                ))}
              </div>
              <p role="status">
                {voiceReady
                  ? "개인사업자이고 가게 운영자금이 필요해요"
                  : "말씀하신 내용을 듣고 있어요…"}
              </p>
              <small>
                음성 입력 체험 화면이에요. 실제 마이크는 사용하지 않아요.
              </small>
              <Button
                disabled={!voiceReady}
                onClick={() => {
                  setModal(null);
                  sendMessage("개인사업자이고 가게 운영자금이 필요해요");
                }}
              >
                이 내용 보내기
              </Button>
            </div>
          )}
          {modal.type === "copy" && (
            <p className="selectable">{state.receipt?.id}</p>
          )}
        </Modal>
      )}
    </div>
  );
}

function EmptyState({ text, action, onClick }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      <Button onClick={onClick}>{action}</Button>
    </div>
  );
}
function Summary({ pass = 0, fix = 0, staff = 0 }) {
  return (
    <div className="summary">
      <div>
        <Asset screen="225:4322" name="imgIcon2" />
        <span>통과</span>
        <strong>{pass}건</strong>
      </div>
      <div className={fix > 0 ? "issue" : "zero"}>
        <Asset screen="225:4322" name="imgIcon1" />
        <span>보완 필요</span>
        <strong>{fix}건</strong>
      </div>
      <div>
        <Asset screen="225:4322" name="imgIcon" />
        <span>직원 확인</span>
        <strong>{staff}건</strong>
      </div>
    </div>
  );
}
function modalTitle(modal) {
  return {
    delete: "등록한 파일을 삭제할까요?",
    staff: "직원에게 확인을 요청할까요?",
    info: "서류 준비 안내",
    guide: "스마트 촬영 가이드",
    faq: modal.title,
    consent: "서류 전달 동의",
    preview: "원문 미리보기",
    copy: "접수번호",
    voice: "음성으로 입력하기",
  }[modal.type];
}

function ResultCards({ results, onDetail }) {
  return ["lease", "tax", "business", "income"]
    .map((id) => results.find((d) => d.id === id))
    .map((d) => {
      const fix = d.status === "fix",
        staff = d.status === "staff";
      const Tag = fix ? "button" : "article";
      return (
        <Tag
          key={d.id}
          className={`result-card ${fix ? "needs-fix" : staff ? "staff" : "passed"}`}
          {...(fix ? { onClick: onDetail } : {})}
        >
          <div>
            <h3>{d.name}</h3>
            <span className={`tag ${fix ? "danger" : staff ? "" : "success"}`}>
              <Asset
                screen="225:4322"
                name={fix ? "imgIcon10" : staff ? "imgIcon7" : "imgIcon4"}
              />
              {fix ? "보완 필요" : staff ? "직원 확인 필요" : "통과"}
            </span>
            {fix && <Asset screen="225:4322" name="imgIcon6" />}
          </div>
          <p>
            <Asset
              screen="225:4322"
              name={fix ? "imgIcon9" : staff ? "imgIcon5" : "imgIcon3"}
            />
            {fix
              ? "2페이지 글자가 흐려요"
              : staff
                ? "대상 기간 확인"
                : "정상 확인"}
          </p>
          {(fix || staff) && (
            <small>
              {fix
                ? "계약기간 항목을 읽기 어려워요. 원본 사진 또는 스캔본을 다시 등록해 주세요."
                : "신청 상품의 대상 기간과 일치하는지 담당자가 확인해요."}
            </small>
          )}
          {fix && (
            <span className="text-link">
              상세보기 <Asset screen="225:4322" name="imgIcon8" />
            </span>
          )}
        </Tag>
      );
    });
}
