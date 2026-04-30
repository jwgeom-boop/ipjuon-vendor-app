import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";
import { api, ApiError } from "@/shell/api/client";
import { PageHeader } from "@/shell/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Consultation } from "../types";
import { ResidentDocStatus } from "./ResidentDocStatus";

type SigningInfo = Consultation & {
  signing_window_start?: string | null;
  signing_window_end?: string | null;
  signing_excluded_dates?: string | null;
  signing_available_times?: string | null;
  signing_available_locations?: string | null;
  signing_selected_date?: string | null;
  signing_selected_time?: string | null;
  signing_selected_location_str?: string | null;
  signing_confirmed_at?: string | null;
  signing_date?: string | null;
};

const TIME_OPTIONS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const DEFAULT_LOCATION = "해당 은행 지점";

function todayPlus(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateToISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function SigningSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SigningInfo>({
    queryKey: ["consultation", id],
    queryFn: () => api.get<SigningInfo>(`/consultation/${id}`),
    enabled: !!id,
  });

  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [times, setTimes] = useState<Set<string>>(new Set(TIME_OPTIONS));
  const [locations, setLocations] = useState<string[]>([DEFAULT_LOCATION]);

  useEffect(() => {
    if (!data) return;
    setWindowStart(data.signing_window_start ?? todayPlus(3));
    setWindowEnd(data.signing_window_end ?? todayPlus(30));
    try {
      setExcludedDates(data.signing_excluded_dates ? JSON.parse(data.signing_excluded_dates) : []);
    } catch {
      setExcludedDates([]);
    }
    try {
      const parsed = data.signing_available_times ? JSON.parse(data.signing_available_times) : null;
      setTimes(new Set<string>(Array.isArray(parsed) && parsed.length > 0 ? parsed : TIME_OPTIONS));
    } catch {
      setTimes(new Set(TIME_OPTIONS));
    }
    try {
      const parsed = data.signing_available_locations ? JSON.parse(data.signing_available_locations) : null;
      setLocations(Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_LOCATION]);
    } catch {
      setLocations([DEFAULT_LOCATION]);
    }
  }, [data]);

  const confirmedAt = data?.signing_confirmed_at;
  const customerPicked = data?.signing_selected_date;
  const isLocked = !!confirmedAt;

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/bank/consultations/${id}/signing-calendar`, {
        window_start: windowStart,
        window_end: windowEnd,
        excluded_dates: excludedDates,
        available_times: Array.from(times).sort(),
        available_locations: locations.filter((l) => l.trim()),
      }),
    onSuccess: () => {
      toast.success("자서 캘린더 공개 — 입주민 앱에 푸시 발송됨");
      qc.invalidateQueries({ queryKey: ["consultation", id] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "저장 실패"),
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/bank/consultations/${id}/confirm-signing-calendar`),
    onSuccess: () => {
      toast.success("자서 일정 확정 — 입주민 앱에 푸시 발송됨");
      qc.invalidateQueries({ queryKey: ["consultation", id] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "확정 실패"),
  });

  function toggleTime(t: string) {
    if (isLocked) return;
    const next = new Set(times);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setTimes(next);
  }

  function toggleExcludedDate(date: Date | undefined) {
    if (!date || isLocked) return;
    const iso = dateToISO(date);
    setExcludedDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()
    );
  }

  function removeExcluded(date: string) {
    setExcludedDates(excludedDates.filter((d) => d !== date));
  }

  const excludedDateObjects = useMemo(
    () => excludedDates.map((d) => isoToDate(d)),
    [excludedDates]
  );

  const windowStartDate = useMemo(
    () => (windowStart ? isoToDate(windowStart) : undefined),
    [windowStart]
  );
  const windowEndDate = useMemo(
    () => (windowEnd ? isoToDate(windowEnd) : undefined),
    [windowEnd]
  );

  function updateLocation(i: number, v: string) {
    setLocations(locations.map((l, idx) => (idx === i ? v : l)));
  }

  function addLocation() {
    setLocations([...locations, ""]);
  }

  function removeLocation(i: number) {
    setLocations(locations.filter((_, idx) => idx !== i));
  }

  const canSave = useMemo(() => {
    return (
      !!windowStart &&
      !!windowEnd &&
      windowStart <= windowEnd &&
      times.size > 0 &&
      locations.some((l) => l.trim())
    );
  }, [windowStart, windowEnd, times, locations]);

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="자서 일정" />
        <p className="text-sm text-muted-foreground text-center py-10">불러오는 중...</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="자서 일정" />
      <div className="px-4 py-4 space-y-4 pb-8">
        {/* 입주민 서류 준비 상태 — 자서 임박 시 가장 먼저 봐야 할 정보 */}
        <ResidentDocStatus data={data} />

        {/* 확정됨 */}
        {confirmedAt && (
          <section className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 uppercase">확정됨</span>
            </div>
            <p className="text-base font-bold text-emerald-900">
              {data.signing_date} · {data.signing_selected_time}
            </p>
            <p className="text-sm text-emerald-800 mt-0.5">{data.signing_selected_location_str}</p>
          </section>
        )}

        {/* 입주민 선택 — 확정 대기 */}
        {!confirmedAt && customerPicked && (
          <section className="rounded-xl border-2 border-blue-400 bg-blue-50 p-4">
            <p className="text-[11px] font-bold text-blue-700 uppercase mb-1">👤 입주민 선택</p>
            <p className="text-base font-bold text-blue-900">
              {data.signing_selected_date} · {data.signing_selected_time}
            </p>
            <p className="text-sm text-blue-800 mt-0.5">{data.signing_selected_location_str}</p>
            <Button
              className="w-full h-11 mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              {confirmMutation.isPending ? "확정 중..." : "✅ 이 일정으로 확정"}
            </Button>
          </section>
        )}

        {/* 표시 기간 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">표시 기간</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">시작일</label>
              <Input
                type="date"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                disabled={isLocked}
                className="h-10 mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">종료일</label>
              <Input
                type="date"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                disabled={isLocked}
                className="h-10 mt-1"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">고객 앱에 표시할 자서 가능 기간</p>
        </section>

        {/* 제외 날짜 — 캘린더 */}
        <section className="rounded-xl border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-bold text-foreground">안 되는 날 ({excludedDates.length})</p>
            <span className="text-[10.5px] text-muted-foreground">
              {isLocked ? "확정됨" : "날짜를 탭해서 토글"}
            </span>
          </div>

          <div className="flex justify-center -mx-1">
            <Calendar
              mode="multiple"
              selected={excludedDateObjects}
              onDayClick={toggleExcludedDate}
              defaultMonth={windowStartDate}
              fromDate={windowStartDate}
              toDate={windowEndDate}
              disabled={isLocked ? () => true : undefined}
              showOutsideDays={false}
              className="text-sm"
              classNames={{
                day_selected:
                  "bg-rose-500 text-white hover:bg-rose-600 focus:bg-rose-600",
                day_today: "ring-1 ring-primary text-primary font-semibold",
                cell: "h-9 w-9 text-center text-sm p-0 relative",
                day: "h-9 w-9 p-0 font-normal rounded-md hover:bg-accent",
              }}
            />
          </div>

          {excludedDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1 pt-1">
              {excludedDates.map((d) => (
                <button
                  key={d}
                  onClick={() => !isLocked && removeExcluded(d)}
                  disabled={isLocked}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11.5px] font-medium disabled:opacity-60"
                >
                  {d.slice(5)}
                  {!isLocked && <X className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}

          <p className="text-[10.5px] text-muted-foreground px-1 pt-0.5">
            🚫 빨간 표시: 제외된 날 · 표시 기간 밖 날짜는 비활성화
          </p>
        </section>

        {/* 가능 시간 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">가능 시간</p>
          <div className="flex flex-wrap gap-1.5">
            {TIME_OPTIONS.map((t) => {
              const on = times.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTime(t)}
                  disabled={isLocked}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-[12.5px] font-medium transition-colors",
                    on
                      ? "bg-blue-50 border-blue-400 text-blue-700"
                      : "bg-card border-border text-muted-foreground"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
          {times.size === 0 && <p className="text-[11px] text-rose-600">최소 1개 이상 선택</p>}
        </section>

        {/* 가능 장소 */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">가능 장소</p>
          <div className="space-y-2">
            {locations.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={l}
                  onChange={(e) => updateLocation(i, e.target.value)}
                  placeholder="예: 부전동지점 2층 상담실"
                  disabled={isLocked}
                  className="h-10 flex-1"
                />
                {!isLocked && locations.length > 1 && (
                  <button
                    onClick={() => removeLocation(i)}
                    className="w-10 h-10 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center"
                    aria-label="삭제"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {!isLocked && (
              <button
                onClick={addLocation}
                className="w-full h-10 rounded-md border-2 border-dashed border-border text-sm text-muted-foreground"
              >
                + 장소 추가
              </button>
            )}
          </div>
        </section>

        {/* 공개 버튼 */}
        {!isLocked && (
          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={!canSave || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending
              ? "저장 중..."
              : customerPicked
              ? "📤 캘린더 다시 공개"
              : "📤 입주민에게 캘린더 공개"}
          </Button>
        )}
      </div>
    </>
  );
}
