<p align="center"><img src="assets/icon-180.png" width="96" alt="dsh-watchlist"></p>

# dsh-watchlist

在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）左侧边栏的对话列表上方加一块**关注区**：你在意的对话留在那里，不再被不断变长的列表挤下去。输入框的模型选择器左侧还有一个关注/结束关注按钮。

中文 | [English](#english)

## 它做什么

- **关注区在对话列表上方**，压在工作区区域上，并把下面的列表整体下推，两边都能用。
- **每行一个状态圆点**：绿色＝有新回复且你没看过；黄色＝这一轮结束了，在等你；蓝色闪烁＝正在运行（派出子代理、自己在等它跑完也算）；红色＝这一轮失败了。
- **排序贴合阅读习惯**：有新回复的对话置顶，正在运行的对话置底——它暂时不需要你做什么。点某一行的圆点重新标记未读时，这一行同样会顶到未读/空闲组的第一行（正在运行的仍按原规则留在最后）。
- **自动进入**：出现内容的新对话、重新发起的对话、刚结束一轮的对话、发出新提问的对话，都会自己进入关注区。**只有**点这一行的 X 或输入框旁的那个按钮才会离开。
- **行操作**：点这一行直接打开；鼠标悬停时出现两个按钮——圆点用于重新标记未读（顺手把这一行顶到最上面），X 用于结束关注。不悬停时不占位，整行看上去就是「圆点＋标题」。
- **打开即定位**：点关注区的行打开对话后，下方工作区列表会自动展开它所在的分组（包括你手动收起过的）、必要时点开「显示更多」，并滚动到那一行；不需要再自己在列表里翻找。
- **高度跟着条数走**：有几条就铺几条，只有当它会占满整列、把工作区挤到没有时，才改为自己内部滚动。

## 安装

```sh
dsh plugin add github:hongcha-dsh/dsh-watchlist
```

装完重启 Harness：前端在下次加载页面时生效，Host 那一半需要重启。

要求：带 Web UI 的 `dsh`（用到客户端插槽 `shell.overlay`、`conversation.input.right`，以及 `uiSession` / `uiWorkspace` 服务）。开发和实际使用都在 `0.2.1-rc` 上。

## 圆点是怎么判定的

一个会话只有一个圆点，按优先级：

| 圆点 | 含义 | 判定方式 |
| --- | --- | --- |
| 黄色 | 在等你 | 会话报告了待处理的交互 |
| 红色 | 失败 | Host 记录到该会话有一轮失败 |
| 蓝色（闪烁） | 运行中 | 状态表或会话列表显示正在运行，或它还有子代理在跑 |
| 绿色 | 未读 | 有新回复，而当时你没在看着这条对话 |
| 灰色 | 空闲 | 已关注，没有新动静 |

「未读」在你真正打开那一条对话时清除，不是按时间清除。一轮结束时**总会**标成未读——哪怕这个对话正开着在主视图里，因为你可能在看关注区或别的窗口；你回复后它会变回蓝色的「运行中」，所以不会一直吵。开着没动的那一条则会一直保持绿色，直到你离开再回来、或点它一次。

派了子代理的对话也一样：分派那一轮结束后，它自己已经空闲，但子代理还在跑，所以它继续按「运行中」显示，不会在子代理没跑完的时候先翻成未读；等最后一个子代理报完，才回到未读、顶到未读组的第一行。

## 排序

正在运行的对话排在最后（在等子代理的同样算运行中）。其余按最近一次活动的排序戳倒序，所以刚收到的回复会把那一行顶到最上面。排序戳只会变大：同一毫秒内的两次回复也能保持稳定顺序，重新关注一条对话也不会把它埋到已有行下面。点某一行的圆点重新标记未读时也会刷新这一行的排序戳，于是这一行立刻回到未读/空闲组的第一行；如果它正在运行，则仍留在最后，等这一轮结束再自然置顶。

## 它存在哪里

浏览器 profile 里的 `localStorage["dsh-watchlist:v1"]`：关注的 id、未读的 id、排序戳。没有服务端状态，也不跨浏览器同步，清站点数据就重置。

子代理（subagent）的子会话不进关注区——分派工作不该多出一行；fork 出来的对话是普通对话，可以关注。派了子代理的父会话在子代理跑完之前按「运行中」显示。

## Host 那一半

前端几乎全部状态都从它已有的 store 里推导。它唯一看不到的，是没有显示在屏幕上的会话里出现的那一轮失败。所以 Host 那一半监听 `agent/error` 与 `api-session/error`，保留最近 64 条，用 `GET /plugins/dsh-watchlist/failures` 提供给页面（仅同源，`no-store`）。

页面每秒轮询一次这个路由。这个轮询同时是看门狗：它会重读会话列表和状态表，所以从输入框刚发出去的提问，在列表还没重新发布之前也能被算进去。

## 致谢

状态图标是四种动作的鲸鱼尾巴，移植自 [dsh-status-rotator](https://github.com/01Virex/dsh-status-rotator)（MIT，Copyright (c) 2026 01Virex）：帧序列重采样（每种动作 150 → 100 帧），轮廓简化为 120×95 viewBox 内的 96 个整数点，由 CSS `d:` 关键帧配 `steps(1, end)` 驱动。动画跟着状态走：未读翻尾、待回复扭转、运行中左右摆。

## 许可证

MIT，见 [LICENSE](LICENSE)。

---

## English

A follow list above the sidebar's conversation list for DeepSeek Harness (`dsh`).

Conversations you care about stay in one place at the top of the left sidebar, each with a status dot, instead of sinking down a list that keeps growing. A follow toggle also sits beside the model selector in the composer.

### What it does

- **A watched area above the conversation list.** It is pinned over the sidebar's workspace region and pushes the list below it down, so both stay usable.
- **Status dots per row.** Green: a reply arrived that you haven't opened. Yellow: the turn ended and it is waiting for you. Blue, blinking: it is running — including a conversation whose delegated subagents are still working. Red: the turn failed.
- **Ordering that matches how you read.** A conversation with news rises to the top; conversations that are running sink to the bottom, because they need nothing from you yet. Clicking a row's dot to mark it unread lifts that row to the top of the unread/idle group too (a running row still waits at the bottom).
- **Rows join on their own.** A new conversation with content, a re-started one, a finished turn, and a new prompt all put that conversation in the area. Leaving is explicit only: the row's X, or the composer toggle.
- **Row actions.** Click a row to open it. Hover for two buttons: the dot marks it unread again and lifts the row to the top, the X unfollows it. Both are hidden until hover, so the row reads as a title with a dot.
- **Opening locates the row.** Opening a followed conversation also expands its Workspace group below (even one you collapsed by hand), asks for more rows when it sits behind "show more", and scrolls that row into view, so the list below ends up on the same conversation without any manual searching.
- **The area grows with the list.** Its height follows the number of followed conversations; it only starts scrolling when it would otherwise take the whole sidebar column.

### Install

```sh
dsh plugin add github:hongcha-dsh/dsh-watchlist
```

Then restart Harness. The Client half is served on the next page load; the Host half needs the restart.

Requirements: a `dsh` build with the Web UI (the plugin uses the client slots `shell.overlay` and `conversation.input.right`, and the `uiSession` / `uiWorkspace` services). Developed and used against `0.2.1-rc`.

### Which conversation gets which dot

One dot per row, chosen by this priority:

| Dot | Meaning | How it is decided |
| --- | --- | --- |
| Yellow | waiting for you | the session reports a pending interaction |
| Red | failed | the Host recorded a failed turn for that session |
| Blue (blinking) | running | the session is running, per the status map or the list, or it still has subagents working |
| Green | unread | a reply arrived while you were not looking at that conversation |
| Grey | idle | followed, nothing new |

Unread clears when you arrive at the conversation, not on a timer. A finished turn is **always** marked unread, even for the conversation that is open in the main view: you may be watching the area itself or another window when the reply lands, and a follow-up prompt turns the row back into the blue running state, so the mark does not pile up. An open conversation left alone stays green until you leave and come back, or click the row once.

A conversation that handed work to subagents behaves the same way: its dispatch turn is over, but the children are still working, so the row keeps reading as running instead of turning unread early. When the last child reports back it falls out of running and takes its place at the top of the unread group.

### Ordering

Conversations that are running sort last — a conversation waiting on its subagents counts as running. Everything else sorts by the stamp of its latest activity, newest first, so a reply you just received puts that row at the top. Stamps only grow: two replies in the same millisecond keep a stable order, and re-following a conversation cannot bury it under rows that were already there. Clicking a row's dot to mark it unread refreshes that row's stamp as well, so it returns to the top of the unread/idle group at once; a running row stays last and rises on its own when the run ends.

### What it stores

`localStorage["dsh-watchlist:v1"]` in the browser profile: followed ids, unread ids, and the ordering stamps. There is no server-side state and no sync between browsers. Clearing site data resets the area.

Subagent child sessions are excluded: delegating work should not add rows. Forks are ordinary conversations and can be followed. A parent reads as running while its subagents are still working.

### The Host half

The Client derives almost everything from stores it already has. The one thing it cannot see is a failed turn of a session it is not displaying, so the Host half listens for `agent/error` and `api-session/error`, keeps the last 64 failures, and serves them at `GET /plugins/dsh-watchlist/failures` (same-origin only, `no-store`).

The page polls that route about once a second. That poll is also the watchdog: it re-reads the session list and the status map, so a prompt sent from the composer counts even before the list republishes.

### Credits

The status marks are a whale tail in four motion variants, ported from [dsh-status-rotator](https://github.com/01Virex/dsh-status-rotator) (MIT, Copyright (c) 2026 01Virex). Frames were resampled (150 → 100 per action) and their outlines simplified to 96 integer points in a 120×95 viewBox, then driven by CSS `d:` keyframes with `steps(1, end)`. The animation follows the row's state: unread flips, waiting twists, running sways.

### License

MIT. See [LICENSE](LICENSE).
