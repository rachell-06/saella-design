# DESIGN.md: Saella Platform

Đọc file này trước khi viết UI. Giá trị token chỉ nằm ở `code/src/styles/tokens.css` (mỗi dòng có ghi chú nguồn và contrast); file này ghi vai trò, lý do và quy tắc, không chép lại mã màu. Thay đổi lớn so với app hiện tại và việc chờ duyệt: `decisions.md`. Sản phẩm: PRD Master https://pgg-prd-lib.vercel.app/docs/saella-prd-master (tra PRD từng module khi cần chi tiết màn hình, không đoán).

## 1. Tinh thần

Platform là bản "công cụ" của LP saella.ai: sáng, sạch, thân thiện, có hệ thống. Giữ từ LP: chữ xanh mực (không đen tuyền), **một** họ màu nhấn cam, font Geist, góc bo vừa (nút 8px, card 12px), hairline thay bóng, focus ring cam. Khác LP: chữ nhỏ và dày hơn (body 14px, bảng 13px), ít chuyển động, không trang trí marketing. Agent làm, người dùng duyệt.

Stack: Next.js + Tailwind 4 + shadcn/ui (`radix-nova`). Light và dark (khối `.dark` trong `tokens.css`), mặc định sáng. Chỉ thiết kế desktop; mobile tạm hoãn.

## 2. Quy tắc đã chốt

**Bố cục**
- Không bóng đổ cho nền, card, khung, bảng trong trang: tách lớp bằng hairline. Bóng chỉ cho phần tử nổi (popover, menu, toast, dialog, sheet, nút nổi).
- Mỗi trang **một** nút cam đặc; nút khác dùng outline hoặc ghost.
- Nội dung tối đa 1536px, căn giữa; thanh header và vạch kẻ dưới nó trải hết bề ngang.
- Dữ liệu cha–con (campaign → template) dùng master–detail (mục 9.6).
- Đầu trang dùng `PageHeader`; màn mới đặt trong `code/src/app/(app)/<màn>/`.

**Bảng**
- Tối đa 2 tầng chữ mỗi dòng. Một cột chỉ một kiểu hiển thị (không lẫn badge với chữ).
- Không đổi nền khi rê chuột lên dòng (`TableRow` gốc không có hover, màn không cần tự tắt). Thao tác dòng và checkbox hiện khi rê chuột hoặc Tab tới; bảng gọn có thể cho thao tác nổi đè lên cột cuối khi rê chuột.
- Một trang chỉ một hàng tab gạch chân. Bộ lọc phụ có đếm dưới nó (vd. Total / New / Already saved ở Find companies) dùng chip `ToggleGroup`.
- Nhãn trạng thái chỉ khi khác trạng thái bình thường (riêng bảng template luôn có cột Status).
- Ô không có số để trống. Phân trang chỉ khi dài hơn một trang.

**Số liệu**
- Tỉ lệ % hiện bằng con số, chữ thường. Ngưỡng lấy theo app thật (`HEALTH_THRESHOLDS`, Repo `src/lib/email/health.ts`, theo giới hạn AWS SES), khai báo ở `RATE_BANDS` (`components/saella/rate-meter.tsx`). Chỉ hai tỉ lệ có ngưỡng: **Bounce** cảnh báo ≥ 5%, nguy hiểm ≥ 10% (mức tự dừng gửi); **Delivery** cảnh báo < 90%. Cảnh báo: chữ `warning-soft-foreground`; nguy hiểm: chữ `destructive-soft-foreground`; cả hai kèm icon và tooltip ghi ngưỡng. Open, Click, Reply, Unsub không có ngưỡng nên không bao giờ tô màu.
- Dưới 20 lượt gửi: số xám, không đánh dấu, tooltip "too few to judge".
- Nơi nào còn dùng thanh `Progress`, thanh luôn bằng đúng con số.
- Mọi giờ hiện theo GMT+7 (`src/lib/time.ts`).

**Nội dung**
- Thông tin phụ vào ⓘ hoặc tooltip, tối đa 1–2 câu. Không đặt đoạn chú thích phương pháp cuối trang.
- Gọi là **agent**, không dùng "assistant".
- Nhân vật chibi toàn thân **chỉ** ở onboarding. Agent dùng Saella mini. Màn trống dùng icon.
- Tên người, công ty trong mock là hư cấu; không dùng khách thật (FTK, Vinex, VMA, Exquee, Aegis). Dữ liệu mẫu đủ để hiện mọi trạng thái cần duyệt.

**Control**
- Component lấy từ `components/ui/` hoặc `components/saella/`; thiếu thì `npx shadcn@latest add`, không tự vẽ.
- Không control native: không `<input type="date|time">` (dùng `DatePicker`, `DateRangePicker`, `TimePicker`), không `<select>` thô.

**Không nên**
- Viết mã màu, `text-[..px]`, `rounded-[..]`, `shadow-[..]`, hoặc màu mặc định Tailwind (`gray-*`, `red-*`). Thiếu token thì thêm vào `tokens.css`.
- Thêm màu nhấn thứ hai, gradient, glow, đen tuyền, icon nhiều màu, emoji làm icon.
- Đặt `primary` làm chữ trên `primary-soft`; đặt `warning` hoặc `chart-5` làm chữ.
- Truyền đạt chỉ bằng màu: trạng thái phải có chữ hoặc icon.
- Animation lặp vô hạn trên control; animation không tắt theo reduced motion.
- Chạy `shadcn apply` / `init --preset` (ghi đè token Saella).

## 3. Token

| Token | Dùng cho |
|---|---|
| `background`, `card`, `popover` | Nền nội dung, card, lớp nổi |
| `foreground` | Chữ chính |
| `muted-foreground` | Chữ phụ, mô tả, nhãn |
| `subtle-foreground` | Placeholder, timestamp, caption (mờ nhất còn đạt AA) |
| `muted` / `secondary` / `accent` | Nền phụ, header bảng, hover menu và nút ghost |
| `primary` / `primary-foreground` / `primary-hover` | Nút chính, link, control đang bật |
| `brand` | Icon nhấn, số lớn, vạch nhấn. Không làm nền nút có chữ nhỏ |
| `primary-soft` / `primary-soft-foreground` | Nền nhấn nhạt, mục đang chọn, badge cam |
| `primary-subtle` | Dòng bảng đang chọn, chip giá trị filter |
| `border` / `input` / `ring` | Hairline card, bảng, divider / viền ô nhập / focus |
| `destructive`, `success`, `warning`, `info` (+ `-foreground`, `-soft`, `-soft-foreground`) | Báo trạng thái (mục 4.1) |
| `status-{draft,scheduled,sending,sent,paused,failed}` | Badge trạng thái batch (mục 4.2) |
| `chart-1..6` | Biểu đồ (mục 4.3) |
| `sidebar*`, `sidebar-hover` | Sidebar |
| `cream`, `peach`, `deep` | Nền onboarding / highlight chữ / overlay dialog |
| `rounded-lg` / `rounded-md` / `rounded-card` / `rounded-full` | Mục 6 |
| `shadow-card` / `shadow-float` | Popover, menu, toast / dialog, sheet |
| `text-dense`, `tracking-title`, `tracking-display` | Bảng dày 13px / tiêu đề 18–24px / số ≥ 30px |
| `ease-standard`, `ease-emphasized`, `--motion-fast/base/slow` | Hover / mở lớp nổi |

## 4. Màu

### 4.1 Nguyên tắc
- Kế thừa LP: nền trắng, khung phụ fog, chữ ink xanh mực, **một** họ cam.
- `brand` (`#BF6603`) dùng cho icon nhấn, số lớn, focus. Nút chính dùng `primary` đậm hơn (`#A85A02`) vì chữ trắng trên `#BF6603` chỉ 4.10:1. Hover nút chính **tối đi** ở light, **sáng lên** ở dark: luôn "ra xa nền".
- `subtle-foreground` thay ink-3 của LP (3.77:1, trượt AA). `input` đậm hơn hairline để viền ô nhập đạt 3:1.
- Họ ngữ nghĩa: `X` = nền đặc, icon, viền; `X-foreground` = chữ trên nền đặc; `X-soft` = nền nhạt; `X-soft-foreground` = chữ và icon trên nền nhạt **và trên trắng**. Chữ cảnh báo luôn dùng `warning-soft-foreground`, không dùng `warning`.

### 4.2 Trạng thái

| Batch | Token | Họ màu |
|---|---|---|
| Draft | `status-draft` | trung tính |
| Scheduled | `status-scheduled` | info-soft |
| Sending | `status-sending` | primary-soft, chấm tĩnh (không nhấp nháy) |
| Sent | `status-sent` | success-soft |
| Paused | `status-paused` | warning-soft (gồm tự dừng do bounce/complaint) |
| Failed | `status-failed` | destructive-soft |

Campaign (Not started / Active / Ended / Archived) và template (Active / Inactive) dùng họ `-soft` qua `StatusBadge`. Badge luôn có chấm + chữ.

### 4.3 Biểu đồ
`chart-1` cam · `chart-2` teal · `chart-3` blue · `chart-4` plum · `chart-5` gold · `chart-6` rose (Bounce). Mỗi chỉ số giữ một màu ở cả sáng và tối. Đã kiểm phân biệt khi mù màu (OKLab, mô phỏng deutan/protan): cặp gần nhất là cam–teal. `chart-5` chỉ 2.16:1 trên trắng: luôn kèm nhãn hoặc legend.

### 4.4 Dark mode
- Nền, chữ, viền lấy bảng dark "neutral" của shadcn (xám trung tính: trang < card, popover, sidebar < muted).
- Giữ của Saella: cam làm nút chính (`#E8892A`, chữ tối), focus cam, viền ô nhập đạt 3:1, màu biểu đồ, nền `-soft` chọn tay. `status-*` trỏ về họ màu nên tự đổi.
- Mọi cặp chữ/nền đạt AA trên **cả** nền trang và card.

### 4.5 Contrast các cặp chính

| Cặp | Light | Dark | Ghi chú |
|---|---|---|---|
| `foreground` / nền | 16.68 | 18.97 | |
| `muted-foreground` / nền | 8.02 | 7.66 | |
| `subtle-foreground` / nền, fog | 4.89, 4.51 | 6.12 | **Không** đặt trên `primary-soft` (4.28) |
| chữ / `primary` | 5.09 | 7.58 | |
| `primary` làm link / nền | 5.09 | 7.58 | Trên `primary-soft` dùng `primary-soft-foreground` (5.75) |
| chữ trắng / `destructive`, `success`, `info` | 6.15, 5.32, 4.70 | | Dark: `destructive` làm chữ trên nền 6.85 |
| chữ soft / nền soft (mọi họ) | ≥ 4.61 | ≥ 7.17 | |
| `warning` / trắng | 2.30 | | Không làm chữ, không làm icon đứng một mình |
| `ring`, `input` / nền | 4.10, 3.17 | ≥ 3.19 | Đạt 3:1 cho viền control |
| `border` / trắng | 1.26 | | Chỉ phân vùng, không làm ranh giới duy nhất của control |

## 5. Chữ

Font **Geist** (`next/font`), fallback CJK (PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC) vì app có tiếng Trung. Body có `font-feature-settings: "ss01"` như LP. Số trong bảng và KPI: `tabular-nums`.

| Class | Cỡ / dòng | Weight | Dùng cho |
|---|---|---|---|
| `text-xs` | 12 / 16 | 500–600 | Chỉ badge, kbd, trục biểu đồ, bộ đếm |
| `text-dense` | 13 / 18 | 400 | Ô bảng dày |
| `text-sm` | 14 / 20 | 400; nút, nhãn 500 | **Body mặc định**, ô nhập, nút, menu |
| `text-base` | 16 / 24 | 400 | Đoạn đọc dài (chat agent, mô tả) |
| `text-lg`, `text-xl` | 18, 20 | 600, `tracking-title` | Tiêu đề khối, dialog, card lớn |
| `text-2xl` | 24 / 32 | 500, `tracking-title` | Tiêu đề trang |
| `text-3xl`+ | ≥ 30 | 400, `tracking-display` | Số KPI, onboarding |

Weight 700 hạn chế. Không viết hoa cả câu; nhãn nhóm 12px 600 màu `muted-foreground`.

## 6. Khoảng cách, bo góc, viền

- Thang 4px. Trong control 8/12px, giữa trường form 16px, giữa khối 24/32px. Lề nội dung 24px.
- Nút và ô nhập 32px (`h-8`), nhỏ 28px, lớn 36px. Nút `sm`/`xs` chữ < 14px nên chỉ dùng cho nút icon hoặc trong bảng. Hàng bảng 40px, dày 36px. Vùng bấm tối thiểu 24×24px.

| Bo góc | Giá trị | Dùng cho |
|---|---|---|
| `rounded-lg` (`--radius`) | 8px | Nút, ô nhập, popover, dropdown |
| `rounded-md` | 6.4px | Item menu, chip filter, nút icon nhỏ |
| `rounded-sm` | 4.8px | Checkbox, kbd |
| `rounded-card` | 12px | Card (`card.tsx`), dialog, khối Saella |
| `rounded-full` | pill | Badge, tag, avatar, chấm trạng thái |

- Mọi phân vùng dùng hairline 1px `border`. Card, bảng, panel, sidebar: **không bóng**.
- Ô nhập, checkbox, select: viền `input`. Focus: ring cam đặc 2px. Lỗi: viền `destructive` + câu lỗi dưới trường.
- Lớp nổi: `shadow-card` cho popover, menu, toast; `shadow-float` cho dialog, sheet, command palette. Overlay dialog: `deep` 40%. Không glow, không bóng màu.

## 7. Chuyển động và icon

- Hover, đổi màu: 150–200ms `ease-standard`. Mở popover, dialog, sheet: 200–300ms `ease-emphasized`. Loading: skeleton hoặc spinner.
- Không mang sang app: vệt sáng nút, chữ cuộn khi hover, reveal khi cuộn, parallax. Mọi animation tắt khi `prefers-reduced-motion`.
- Icon: Lucide, stroke 1.75–2, 16px trong control, 20px trong nav. Màu theo chữ đi kèm; icon nhấn dùng `brand`.

## 8. Component

Chỉ ghi phần Saella **khác** shadcn/ui; phần còn lại theo docs shadcn.

| Thư mục | Chứa gì | Quy tắc |
|---|---|---|
| `src/components/ui/` | Component shadcn gốc | Chỉ chỉnh theme qua token; được sửa class cho đúng DS, không đổi API |
| `src/components/saella/` | Component ghép riêng Saella | Ghép từ `ui/`, chỉ dùng token |
| `src/components/layout/` | Khung app | |
| `src/app/(app)/<màn>/_components/` | Component chỉ một màn dùng | |

Áp cho mọi component trong `ui/` (kể cả khi thêm mới): focus `ring-2 ring-ring` (bản shadcn `ring-3 ring-ring/50` không đạt 3:1); viền overlay và card `ring-border`; bóng theo mục 6; bỏ các lớp `dark:bg-input/30`… vì token `.dark` đã lo.

### 8.1 Khác shadcn

| Component | Khác |
|---|---|
| Button | `default` = `primary`, hover `primary-hover`. `outline` viền `input`. `destructive` nền `destructive-soft` |
| Input, Textarea | Viền `input`; placeholder `subtle-foreground` |
| Select | Popover `shadow-card`, mục đang chọn có dấu check |
| Checkbox, Radio, Switch | Bật = `primary`, tắt viền `input`. Checkbox có trạng thái "chọn một phần" |
| Badge | Pill 12px weight 600. Tông: trung tính, `brand`, `success`, `warning`, `info`, `destructive` (họ `-soft`) |
| Table | Header nền `muted`, chữ 13px 600 `muted-foreground`; dòng chọn `primary-subtle`; không đổi nền khi rê chuột |
| Tabs | Mặc định kiểu gạch dưới màu `brand`, tab chưa chọn `muted-foreground`. Chuyển chế độ xem (Rates / Counts) dùng `TabsList variant="default"` |
| Toggle, ToggleGroup | Mục đang chọn nền `primary-soft`. Chip chọn nhiều (series biểu đồ, lọc sự kiện) |
| Dialog, AlertDialog | Bo 12px, `shadow-float`, overlay `deep` 40%. `DialogContent` có `grid-cols-[minmax(0,1fr)]`: nội dung rộng cuộn bên trong |
| Sheet | `shadow-float`. Dùng cho chi tiết contact, công ty |
| Alert | Thêm tông `info`, `success`, `warning`. Alert cho thông báo nằm lại, toast cho xác nhận ngắn |
| Toast (`sonner`) | Icon theo họ ngữ nghĩa; warning dùng `warning-soft-foreground` |
| Card | `rounded-card` (12px) |

### 8.2 Component Saella (`components/saella/`)

| Component | Dùng cho |
|---|---|
| `StatusBadge` | Trạng thái campaign / template / batch: chấm + chữ; `sending` chấm nhấp nháy |
| `KpiStrip` | Mẫu KPI **duy nhất** (Overview, Campaigns, báo cáo batch, Billing): dải số liệu liền khối, không icon trang trí; ô có `href` thì bấm được, `detail` vào tooltip, tông `warning`/`danger` khi vượt ngưỡng |
| `RateCell`, `RateValue`, `rateKpi` | Tỉ lệ email (`rate-meter.tsx`): "38.3% (466)", mẫu số trong tooltip, chỉ Bounce/Delivery tô màu kèm icon theo `RATE_BANDS`. `RateCell` cho bảng, `RateValue` nội dòng, `rateKpi` cho ô `KpiStrip`. `RateMeters` (thang 3 nấc) đã xoá 2026-11-05 |
| `MetricCard` | Không dùng cho màn mới (Overview đổi sang `KpiStrip` 2026-11-05) |
| `DataTable` | Bảng TanStack v9: sắp xếp, chọn nhiều + thanh thao tác phía trên, phân trang, loading, empty, mở rộng dòng (`renderExpanded`), thao tác hiện khi rê chuột (`revealOnRowHover`) |
| `FilterBar` | Ô tìm + menu lọc + chip giá trị + Clear all; điều khiển được từ ngoài (URL, agent) |
| `MultiSelect`, `TreeSelect`, `TagInput` | Chọn nhiều, chọn theo cây, nhập tag |
| `DatePicker`, `DateRangePicker`, `TimePicker` | Chọn ngày giờ (thay ô native), giờ theo GMT+7 |
| `ChartCard`, `Sparkline` | Thẻ biểu đồ, đường nhỏ |
| `Stepper` | Wizard nhiều bước |
| `ApprovalCard`, `AgentSteps` | Agent đề xuất chờ duyệt, các bước agent đang chạy |
| `SaellaMini` | Gương mặt agent, nền tròn `primary-soft`, cỡ 20–96px, `state` idle / thinking |
| `CopyButton`, `LanguagePicker` | Copy giá trị (DNS record…), chọn ngôn ngữ |
| `TableFill` | Cho bảng cao hết trang. Nợ kỹ thuật: chỉnh `DataTable` từ bên ngoài, nên thay bằng tuỳ chọn `fill` / `stickyHeader` |

### 8.3 Khung app (`components/layout/`)

`AppShell` (sidebar + header + panel agent kéo 320–900px), `AppSidebar` (thu gọn icon, nhóm có nhãn, menu tài khoản có Light / Dark / System), `PageHeader`, `SearchCommand` (Ctrl/⌘K), `NotificationsMenu`, `AgentPanel` + nút nổi "Ask the agent", `LeadsTabs`, `ThemeProvider` (mặc định sáng).

### 8.4 Trạng thái bắt buộc

Mỗi component (gốc hoặc ghép) phải có:

| Trạng thái | Cách thể hiện |
|---|---|
| hover | nền `accent` hoặc `primary-hover`, 150–200ms |
| focus | `focus-visible` ring cam 2px |
| disabled | opacity 50%, không hover |
| loading | spinner hoặc skeleton, giữ nguyên kích thước, `aria-busy` |
| empty | câu nói vì sao trống + một hành động tiếp theo |
| error | viền + chữ `destructive`, thông báo nói cách sửa |

## 9. Pattern

### 9.1 Bảng dữ liệu + bộ lọc
Dùng cho Leads, Templates, Recipients, Settings. Quy tắc trình bày bảng: mục 2.
- Đầu trang `PageHeader` (tiêu đề `text-2xl`, nút chính bên phải). Dưới là `FilterBar`: ô tìm, menu lọc, chip giá trị ("Country: Vietnam", nền `primary-subtle`, có ×), "Clear filters" chỉ khi đang lọc, số kết quả cập nhật ngay.
- Lọc dữ liệu **trước** khi đưa vào bảng; bộ lọc nằm trên URL để agent và thông báo dẫn link được. Bảng chỉ sắp xếp, chọn, phân trang.
- Chọn nhiều dòng: thanh thao tác hàng loạt hiện **phía trên** bảng (nền `primary-subtle`), thanh lọc vẫn giữ.
- Bảng cao hết trang, tiêu đề dính khi cuộn. Cột số căn phải, `tabular-nums`. Icon sắp xếp chỉ ở cột đang sắp xếp.
- Ba trạng thái khác nhau: chưa có dữ liệu (giải thích + nút tạo), lọc không ra (nút "Clear filters"), lỗi (banner `destructive-soft` + "Retry"). Loading = skeleton đúng số cột.

### 9.2 Form nhiều bước
Dùng cho gửi batch, sending setup (domain, DNS, sender), onboarding.
- `Stepper` trên cùng; bước xong có tick `success`. Nút "Back" (outline) và "Continue" (primary) ở đáy.
- Mỗi bước một nhóm quyết định. Kiểm lỗi khi rời trường, câu lỗi dưới trường; quay lại bước trước không mất dữ liệu.
- Bước cuối là Review: tóm tắt + kiểm tra trước khi gửi (dữ liệu người nhận thiếu → chọn fallback hoặc loại ra; lỗi chặn nút gửi).
- Bước kỹ thuật (DNS record) có `CopyButton` và trạng thái xác minh riêng từng record.

### 9.3 Trình soạn email
Dùng cho Templates editor, Write with AI.
- Ba vùng: trái (khối, merge tag), giữa (xem như người nhận), phải (thuộc tính khối, kiểm nội dung).
- Merge tag hiện dạng chip (cả ngoài trình soạn: subject ở báo cáo batch và New batch, `SubjectText`); tag lạ viền `destructive` và chặn "Mark active". Subject check chấm ngay khi gõ, không chặn lưu; chỉ liệt kê mục chưa đạt, mục đạt gộp thành "6 of 6 look good".
- Write with AI: một lối vào duy nhất (tab ở panel phải). Kết quả vào vùng xem trước, người dùng chọn "Use" / "Try again", không ghi đè thẳng.
- Màu của template (người dùng chọn) tách khỏi màu UI Saella. Khung email luôn dùng bảng màu sáng `.email-canvas` (token `--email-*`, cố ý không có bản `.dark`), kể cả khi app ở chế độ tối: đúng thứ người nhận thấy.

### 9.4 Agent đề xuất → người dùng duyệt
Theo PRD-03 (https://pgg-prd-lib.vercel.app/docs/saella-prd-aiagent).
- **Vào chat:** nút nổi "Ask the agent" trên mọi trang, trừ `/agent`; nền cam nhạt (`primary-soft`, viền `primary/20`, có bóng vì là phần tử nổi), không bao giờ cam đặc để nút cam đặc của trang vẫn là duy nhất. Ghi chú "Always allow" nằm trong ⓘ cạnh tiêu đề Campaign flow. Mở panel bên phải kéo 320–900px. Ô nhập "Ask the agent…" có đính kèm và dòng nhắc "Writes wait for your approval". Đang trả lời thì nút Gửi thành Stop.
- **Tin nhắn:** người dùng = bong bóng `muted` bên phải; agent = không bong bóng, rộng hết để chứa bảng và thẻ duyệt. Lời chào lần đầu: Saella mini 56px + 3 gợi ý bấm được.
- **Đang làm:** `AgentSteps`, mỗi tool call một dòng (quay khi chạy, tick khi xong, đỏ khi lỗi), bấm để xem chi tiết.
- **Duyệt:** `ApprovalCard` cho bước bị chặn (2 hay 5 bước: chờ chốt, `decisions.md`). Dải "Needs your approval" nền `primary-soft`; thân = hành động + chi tiết + một dòng hệ quả; nút **Approve** / **Always allow this step** / **No**. Gửi thật phải tick xác nhận đúng số người trước khi Approve; từ 100 người thì gửi thử 20 trước.
- **Sau khi quyết:** thẻ thu thành một dòng: tick + kết quả, hoặc "You said no. Nothing was changed."
- **Approval queue:** sheet gom việc chờ duyệt của mọi thread, trái là danh sách, phải là bản xem trước đúng thứ sẽ lưu/gửi.
- **Lỗi:** mất kết nối = bong bóng `destructive` + "Try again"; quá số bước = "Stopped for safety…"; giới hạn tần suất = dòng có thời gian chờ.

### 9.5 Màn trống
- Icon → tiêu đề một dòng → câu giải thích → một nút chính (+ link phụ). Không dùng nhân vật chibi.
- Phân biệt: chưa có dữ liệu lần đầu / lọc không ra / không có quyền / lỗi tải.

### 9.6 Master–detail (dữ liệu cha–con)
Dùng cho Campaigns (campaign → template).
- Tab trạng thái có đếm cùng hàng với tìm kiếm + lọc. Dưới là khung chia đôi: trái 280px danh sách cha (mục chọn nền `primary-subtle` + vạch `brand` bên trái), phải là chi tiết (đầu trang, dải KPI liền khối, bảng con có hàng tiêu đề).
- Mục đang chọn ghi vào URL (`?c=<id>`). Bộ lọc làm mất mục đang chọn thì tự chọn mục đầu.
- Dòng con phụ thuộc (follow-up) nằm ngay dưới dòng gốc, thụt vào có ↳, dòng phụ là điều kiện.
- Mở rộng dòng (`renderExpanded`) chỉ khi dòng con ít và không cần đủ cột.

### 9.7 Số liệu
- KPI dùng `KpiStrip` ở mọi màn: tên, tỉ lệ, dòng đếm theo đúng mẫu số. Delivery và Bounce: "8,479 of 8,675 sent"; các tỉ lệ khác: "3,462 of 8,479 delivered". Không icon trang trí.
- Tỉ lệ trong bảng: mỗi tỉ lệ một cột số căn phải (để so và sắp xếp được), số đếm xám trong ngoặc ngay sau tỉ lệ ("12.2% (93)", chốt 2026-11-05); mẫu số ghi trong tooltip (không dùng `title=` native). Bảng tỉ lệ không cần cột Delivered riêng. Thanh tỉ lệ (vd. Links) = phần của tổng thật và in kèm %, không so với dòng cao nhất hay với ngưỡng.
- Ô số liệu ở báo cáo bấm được, mở danh sách đã lọc tương ứng.
- Lọc theo sự kiện bằng chip có đếm (`ToggleGroup`), không dùng dropdown.
- Biểu đồ: ngày không có dữ liệu thì bỏ điểm, không vẽ về 0. Trục tự co theo chỉ số đang chọn.
- Biểu đồ theo thời gian: mỗi cột là một khoảng thời gian, cộng gộp mọi campaign trong phạm vi lọc (không bao giờ một cột mỗi campaign). Cỡ khoảng theo độ dài khoảng lọc: ≤ 31 ngày → ngày, ≤ 120 ngày → tuần (T2–CN), dài hơn → tháng. Tỉ lệ của một cột = tổng tử ÷ tổng mẫu của khoảng đó; dưới 20 lượt gửi thì cột xám, tooltip "too few to judge". Mỗi khoảng một ô chia đều bề ngang (cột rộng tối đa 48px, nằm giữa ô); mỗi cột một nhãn nằm đúng dưới ô của nó (theo ngày: chỉ số ngày, kèm tháng ở cột đầu và ngày 1 của tháng, "Oct 5 6 … Nov 1 2 3"); khoảng không gửi hiện vạch xám 2px ở đáy.
- Biểu đồ theo campaign → template → batch: mỗi batch rơi vào cột của ngày nó được gửi; tỉ lệ tính theo ngày gửi của batch (open/reply về sau vẫn cộng về ngày gửi). Batch gửi trong 3 ngày gần nhất tô nhạt, tooltip "Still collecting". Rê vào cột liệt kê batch của cột (3 cái đầu + "+N more"); bấm cột mở danh sách batch. Bộ lọc Template phụ thuộc Campaign.
- KPI, biểu đồ và bảng chia nhỏ trong cùng một khối lọc phải tính từ cùng một tập dữ liệu đã lọc; tỉ lệ tổng = tổng tử ÷ tổng mẫu, không lấy trung bình tỉ lệ từng dòng.

## 10. Kiểm tra trước khi báo xong

- [ ] Chỉ class từ token; chữ trên nền `*-soft` dùng `*-soft-foreground`.
- [ ] Đủ trạng thái (mục 8.4). Loading giữ nguyên layout; empty và error có câu giải thích + hành động tiếp theo.
- [ ] Body ≥ 14px, bảng dày ≥ 13px, 12px chỉ cho badge, kbd, trục. Chữ ≥ 4.5:1; viền control, icon mang nghĩa, focus ≥ 3:1. Số dùng `tabular-nums`.
- [ ] Focus thấy được trên mọi phần tử tương tác; control có nhãn (`aria-label` cho nút chỉ có icon); vùng bấm ≥ 24×24px.
- [ ] Chụp 1440px sáng + tối (`scripts/screenshot.mjs`, lưu vào thư mục tạm): không cuộn ngang, dòng phụ không bị cắt, cột tên không bị bóp.
- [ ] Typecheck và lint sạch; console không lỗi, không warning (kể cả hydration). Đổi nhiều file thì khởi động lại `npm run dev` rồi kiểm tra lại.

## 11. Tham chiếu

- **saella.ai** (source `D:\Workspace\Saella\Saella LP`): nguồn style chính.
- **shadcn/ui**, style `radix-nova`: nguồn component.
- **Studio Admin** (bản clone chỉ đọc `D:\Workspace\Saella\Studio Admin`, demo https://studio-admin.arhamkhnz.com): học bố cục, spacing, cấu trúc; dựng lại bằng component + token Saella, không chép CSS, màu, `components/ui/`.
- **Đối thủ** (Mailchimp, Apollo, HubSpot, Clay, Unify, Hunter, Buffer qua Mobbin): `01 Docs/Competitor.md`.
- Khác: Vercel Geist, Shopify Polaris (empty state, UI copy), IBM Carbon (bảng dày, nhãn nội dung AI), Atlassian (đặt tên token, cặp light/dark).
