// カレンダー ID はスクリプト プロパティに置く（README 参照）
function requiredProperty(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key)
  if (!value) throw new Error(`スクリプト プロパティ ${key} が未設定です`)
  return value
}

const sourceCalendarID = requiredProperty('SOURCE_CALENDAR_ID');
const targetCalendarID = requiredProperty('TARGET_CALENDAR_ID')

/**
 * 一週間分のイベントを同期する
 */
function updateOneWeek() {
  const fromDateTime = new Date();
  const toDateTime = new Date();
  toDateTime.setDate(fromDateTime.getDate() + 7);

  libUpdateCalendar(fromDateTime, toDateTime)
}

/**
 * 三ヶ月分のイベントを同期する
 */
function updateThreeMonthes() {
  const fromDateTime = new Date();
  const toDateTime = new Date();
  toDateTime.setDate(fromDateTime.getDate() + 90);

  libUpdateCalendar(fromDateTime, toDateTime)
}

/**
 * 一ヶ月分のイベントを同期する
 */
function updateOneMonth() {
  const fromDateTime = new Date();
  const toDateTime = new Date();
  toDateTime.setDate(fromDateTime.getDate() + 30);

  libUpdateCalendar(fromDateTime, toDateTime)
}

/**
 * 指定範囲のカレンダーを同期する
 * 差分だけを作成・削除するので、途中で失敗しても次の実行で揃う
 */
const libUpdateCalendar = (fromDateTime, toDateTime) => {
  // ソースカレンダーから、複製すべきイベントをタイトル・開始・終了時刻をキーに集める
  const sourceCalendar = CalendarApp.getCalendarById(sourceCalendarID);
  const wanted = new Map()
  sourceCalendar.getEvents(fromDateTime, toDateTime).forEach(it => {
    if (it.getTitle() === '用事あり') return
    if (it.getMyStatus() === CalendarApp.GuestStatus.NO) return
    if (it.isAllDayEvent()) return
    const key = eventKey(it)
    if (!wanted.has(key)) wanted.set(key, [])
    wanted.get(key).push({ title: it.getTitle(), start: it.getStartTime(), end: it.getEndTime() })
  })

  // ターゲット側のイベントのうち、あるべきものは残し、不要なものだけ集める
  const targetCalendar = CalendarApp.getCalendarById(targetCalendarID);
  const stale = targetCalendar.getEvents(fromDateTime, toDateTime)
    .filter(it => !wanted.get(eventKey(it))?.pop())

  // 先に作成してから削除する（途中で落ちても予定が抜けないように）
  const missing = [...wanted.values()].flat()
  missing.forEach(it => targetCalendar.createEvent(it.title, it.start, it.end))
  stale.forEach(it => it.deleteEvent())
  console.log(`作成 ${missing.length} 件, 削除 ${stale.length} 件`)
}

const eventKey = event => `${event.getTitle()}|${event.getStartTime().getTime()}|${event.getEndTime().getTime()}`
