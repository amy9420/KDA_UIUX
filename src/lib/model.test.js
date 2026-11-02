import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_STATE,
  reducer,
  canSubmit,
  getResults,
  validateFile,
} from "./model.js";

test("서류 조회와 보완 전에는 제출할 수 없다", () => {
  let state = reducer(INITIAL_STATE, {
    type: "upload",
    value: { name: "계약서.pdf" },
  });
  assert.equal(canSubmit(state), false);
  state = reducer(state, { type: "fetch" });
  state = reducer(state, { type: "check" });
  assert.equal(canSubmit(state), false);
  state = reducer(state, { type: "recheck" });
  assert.equal(
    canSubmit(state),
    false,
    "원본은 재점검만 눌러도 통과하지 않는다",
  );
  state = reducer(state, {
    type: "upload",
    value: {
      name: "임대차계약서_보완.pdf",
      sample: true,
      sampleVariant: "corrected",
    },
  });
  state = reducer(state, { type: "check" });
  assert.equal(canSubmit(state), true);
  assert.deepEqual(
    getResults(state).map((d) => d.status),
    ["pass", "pass", "staff", "pass"],
  );
});

test("직원 확인 요청 경로는 두 서류를 직원 확인으로 표시한다", () => {
  let state = {
    ...INITIAL_STATE,
    fetched: true,
    upload: { name: "계약서.pdf" },
    checked: true,
  };
  state = reducer(state, { type: "request" });
  assert.equal(canSubmit(state), true);
  assert.equal(getResults(state).filter((d) => d.status === "staff").length, 2);
});

test("파일을 교체하거나 삭제하면 이전 점검 결과를 폐기한다", () => {
  const state = {
    ...INITIAL_STATE,
    upload: {},
    checked: true,
    corrected: true,
  };
  assert.equal(reducer(state, { type: "upload", value: {} }).checked, false);
  assert.equal(reducer(state, { type: "delete" }).upload, null);
  assert.equal(canSubmit(reducer(state, { type: "delete" })), false);
});

test("비어 있거나 지원하지 않는 업로드를 거절한다", () => {
  assert.ok(validateFile({ name: "a.pdf", size: 0, type: "application/pdf" }));
  assert.ok(validateFile({ name: "a.exe", size: 20, type: "" }));
  assert.ok(
    validateFile({ name: "a.pdf", size: 20, type: "application/x-msdownload" }),
  );
  assert.ok(
    validateFile({
      name: "a.pdf",
      size: 21 * 1024 * 1024,
      type: "application/pdf",
    }),
  );
  assert.equal(
    validateFile({ name: "a.pdf", size: 20, type: "application/pdf" }),
    "",
  );
});
