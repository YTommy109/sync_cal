// カレンダー ID はスクリプト プロパティに置く（README 参照）
function requiredProperty(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key)
  if (!value) throw new Error(`スクリプト プロパティ ${key} が未設定です`)
  return value
}

const mainCalendarID = requiredProperty('MAIN_CALENDAR_ID')
const blockItems = [{
  id:     requiredProperty('BLOCK_CALENDAR_ID'),
  color:  CalendarApp.EventColor.BLUE
}]

/**
 * 一週間分のイベントを同期する
 */
function updateOneWeek() {
  const fromDateTime = new Date()
  const toDateTime = new Date()
  toDateTime.setDate(fromDateTime.getDate() + 5)

  libUpdateCalendar(fromDateTime, toDateTime)
}

/**
 * 三ヶ月分のイベントを同期する
 */
function updateThreeMonthes() {
  const fromDateTime = new Date()
  const toDateTime = new Date()
  toDateTime.setDate(fromDateTime.getDate() + 90)

  libUpdateCalendar(fromDateTime, toDateTime)
}

/**
 * 一ヶ月分のイベントを同期する
 */
function updateOneMonth() {
  const fromDateTime = new Date()
  const toDateTime = new Date()
  toDateTime.setDate(fromDateTime.getDate() + 30)

  libUpdateCalendar(fromDateTime, toDateTime)
}

/**
 * 指定範囲のカレンダーを同期する
 * 差分だけを作成・削除するので、途中で失敗しても次の実行で揃う
 * （Utility)
 */
const libUpdateCalendar = (fromDateTime, toDateTime) => {
  const mainCalendar = CalendarApp.getCalendarById(mainCalendarID)

  // あるべきブロックイベントを、開始・終了時刻をキーに集める
  // ponytail: 色はキーに含めない。同時刻のブロックが既にあれば色が違っても作り直さない
  const wanted = new Map()
  blockItems.forEach(it => {
    CalendarApp.getCalendarById(it.id).getEvents(fromDateTime, toDateTime).forEach(src => {
      const key = eventKey(src)
      if (!wanted.has(key)) wanted.set(key, [])
      wanted.get(key).push({ start: src.getStartTime(), end: src.getEndTime(), color: it.color })
    })
  })

  // 既存のブロックイベントのうち、あるべきものは残し、不要なものだけ集める
  const stale = []
  mainCalendar.getEvents(fromDateTime, toDateTime).forEach(it => {
    if (it.getTitle() !== '用事あり') return
    if (!wanted.get(eventKey(it))?.pop()) stale.push(it)
  })

  // 先に作成してから削除する（途中で落ちてもブロックが抜けないように）
  const missing = [...wanted.values()].flat()
  missing.forEach(it => mainCalendar.createEvent('用事あり', it.start, it.end).setColor(it.color))
  stale.forEach(it => it.deleteEvent())
  console.log(`作成 ${missing.length} 件, 削除 ${stale.length} 件`)
}

const eventKey = event => `${event.getStartTime().getTime()}|${event.getEndTime().getTime()}`
