# DESIGN.md: Saella Platform

Quy tắc và pattern giao diện của app Saella: **làm thế nào**. Vì sao làm vậy và cho ai: `PRODUCT.md`. Giá trị màu, cỡ, bóng: `tokens.css` (file này chỉ ghi vai trò, không chép giá trị). Bản đồ đầy đủ các tài liệu: `CLAUDE.md`.

Số mục trong file này được code và docs trích dẫn (`DESIGN.md §9.7`…): **thêm mục mới thì đánh số tiếp, không đánh số lại**.

**Tra nhanh: đang làm gì thì đọc mục nào.**

| Đang làm | Đọc |
|---|---|
| Bất kỳ màn nào | Mục 2, rồi mục 10 trước khi báo xong |
| Bảng, danh sách, bộ lọc | Mục 2 "Bảng", 9.1 |
| Số liệu, tỉ lệ, biểu đồ | Mục 2 "Số liệu", 9.7 |
| Mở chi tiết, tạo mới: trang, sheet hay dialog | 9.9 |
| Lưu, xoá, báo thành công hoặc lỗi | 9.10 |
| Form, trường nhập | 9.11 (một bước), 9.2 (nhiều bước) |
| Nút người dùng không được bấm, giới hạn gói | 9.12 |
| Ngày giờ, số, chữ dài, ngôn ngữ | 9.8, 9.13 |
| Import, xác minh domain, gửi batch, export | 9.14 |
| Màn trống | 9.5 |
| Viết chữ trên màn: tiêu đề, mô tả, nhãn, nội dung ô | 9.15 |
| Agent | 9.4 |

## 1. Tinh thần

Saella Platform là bản "công cụ" của saella.ai: **sáng, sạch, có hệ thống, thân thiện mà không phô trương**. Nguyên tắc sản phẩm (duyệt trước rồi mới chạy, số liệu trung thực, giấu kỹ thuật nhưng không giấu sự thật, mỗi màn một việc chính, dày mà dễ quét) ở `PRODUCT.md` mục 6. Mục này chỉ thêm hai nguyên tắc thị giác:

| Nguyên tắc | Nghĩa là | Vì sao |
|---|---|---|
| **Một điểm nhấn** | Một họ màu cam, một nút cam đặc mỗi trang | Mắt biết ngay việc chính; màu cam còn giá trị khi hiếm |
| **Phân lớp bằng đường, không bằng bóng** | Hairline tách vùng; bóng chỉ cho thứ nổi trên trang | Màn dày dữ liệu cần yên tĩnh; bóng dành để báo "lớp tạm" |

Kế thừa từ LP: chữ ink xanh mực (không đen tuyền), một họ cam, Geist, bo góc vừa, hairline thay bóng, focus ring cam. Khác LP: chữ nhỏ và dày hơn, ít chuyển động, không trang trí marketing.

**Phạm vi.** Next.js + Tailwind 4 + shadcn/ui (`radix-nova`). Light và dark (khối `.dark` trong `tokens.css`), mặc định light. Desktop; mobile tạm hoãn.

## 2. Quy tắc đã chốt

Các quyết định đã qua duyệt. Không thay đổi nếu chưa ghi lại ở đây.

**Bố cục**
- Không bóng cho nền, card, khung, bảng trong trang; tách lớp bằng hairline. Bóng chỉ cho phần tử nổi: popover, menu, toast, dialog, sheet, nút nổi.
- Mỗi trang **một** nút cam đặc; mọi nút khác `outline` hoặc `ghost`.
- Nội dung rộng tối đa 1536px, căn giữa. Thanh header và vạch kẻ dưới nó trải hết bề ngang (chỉ phần bên trong bị giới hạn).
- Đầu trang luôn là `PageHeader`; màn mới đặt trong `code/src/app/(app)/<màn>/`.
- Dữ liệu cha–con (campaign → template) dùng master–detail (mục 9.6).

**Bảng**
- Tối đa 2 tầng chữ mỗi dòng. Một cột một kiểu hiển thị: không lẫn badge với chữ.
- Không đổi nền khi rê chuột lên dòng (`TableRow` gốc đã bỏ hover). Thao tác dòng và checkbox hiện khi rê chuột hoặc Tab tới; bảng gọn có thể cho thao tác nổi đè lên cột cuối.
- Một trang chỉ một hàng tab gạch chân. Bộ lọc phụ có đếm bên dưới (vd. Total / New / Already saved ở Find companies) dùng chip `ToggleGroup`.
- Chỉ hiện nhãn trạng thái khi khác trạng thái bình thường; ngoại lệ: bảng template luôn có cột Status.
- Ô bảng không có số thì để trống (không "0%", không "–"). Ô KPI chưa có số thì hiện "–". Cả hai không bao giờ hiện "0" thay cho "chưa biết" (PRD Master v1.6.8). Chỉ phân trang khi dài hơn một trang.

**Số liệu**
- Tỉ lệ email (Delivery, Open, Click, Reply, Unsub, Bounce) là con số, chữ thường, không thanh, không thang nấc. Thanh chỉ dùng cho "phần của một tổng", vd. lượt bấm từng link (mục 9.7).
- Chỉ hai tỉ lệ có ngưỡng, lấy từ app thật (`HEALTH_THRESHOLDS`, Repo `src/lib/email/health.ts`, theo giới hạn AWS SES), khai báo một nơi ở `RATE_BANDS` (`components/saella/rate-meter.tsx`):

| Tỉ lệ | Cảnh báo | Nguy hiểm |
|---|---|---|
| Bounce | ≥ 5% | ≥ 10% (mức tự dừng gửi) |
| Delivery | < 90% | |

  Cảnh báo: chữ `warning-soft-foreground`; nguy hiểm: chữ `destructive-soft-foreground`; cả hai kèm icon và tooltip ghi ngưỡng. Open, Click, Reply, Unsub **không có ngưỡng nên không bao giờ tô màu**.
- Dưới 20 lượt gửi: số xám, không đánh dấu, tooltip "too few to judge".
- Nơi nào còn thanh `Progress`, độ dài thanh luôn bằng đúng con số.
- Mọi thời gian hiện theo múi giờ của workspace, mặc định GMT+7; giờ gắn với hành động luôn ghi kèm múi giờ (mục 9.8).

**Nội dung**
- Chỉ hiện chữ người dùng **dùng để làm gì đó**; logic nghiệp vụ thể hiện qua cách UI hoạt động, không viết thành chữ giải thích. Chi tiết: mục 9.15.
- Thông tin phụ vào ⓘ hoặc tooltip, tối đa 1–2 câu. Không đặt đoạn chú thích phương pháp cuối trang.
- Gọi là **agent**, không bao giờ "assistant". Giọng chữ: `PRODUCT.md` mục 4.
- Nhân vật chibi toàn thân **chỉ** ở onboarding. Agent dùng Saella mini. Màn trống dùng icon.
- Dữ liệu mẫu: tên người, công ty hư cấu, không dùng khách thật (FTK, Vinex, VMA, Exquee, Aegis); số liệu chỉ minh hoạ, không phải claim marketing; đủ để hiện mọi trạng thái cần duyệt.

**Control**
- Component lấy từ `components/ui/` hoặc `components/saella/`; thiếu thì `npx shadcn@latest add`, không tự vẽ.
- Không control native: không `<input type="date|time">` (dùng `DatePicker`, `DateRangePicker`, `TimePicker`), không `<select>` thô.

**Không nên**

| Không | Thay bằng |
|---|---|
| Mã màu, `text-[..px]`, `rounded-[..]`, `shadow-[..]`, màu mặc định Tailwind (`gray-*`, `red-*`) | Token. Thiếu thì thêm vào `tokens.css` |
| Màu nhấn thứ hai, gradient, glow, đen tuyền, icon nhiều màu, emoji làm icon | Một họ cam, ink, icon Lucide một màu |
| `primary` làm chữ trên `primary-soft`; `warning` hoặc `chart-5` làm chữ | `primary-soft-foreground`, `warning-soft-foreground`, nhãn/legend |
| Truyền đạt chỉ bằng màu | Màu + chữ hoặc icon |
| Animation lặp vô hạn trên control; animation không tắt theo reduced motion | Mục 7 |
| `shadcn apply` / `init --preset` (ghi đè token Saella) | Sửa `tokens.css` |

## 3. Token

Đặt tên theo **vai trò**, không theo màu: đổi giá trị không phải đổi code.

| Token | Vai trò |
|---|---|
| `background`, `card`, `popover` | Nền trang, card, lớp nổi |
| `foreground` | Chữ chính |
| `muted-foreground` | Chữ phụ, mô tả, nhãn |
| `subtle-foreground` | Placeholder, timestamp, caption: mức mờ nhất còn đạt AA |
| `muted` / `secondary` / `accent` | Nền phụ, header bảng, hover menu và nút ghost |
| `primary` / `primary-foreground` / `primary-hover` | Nút chính, link, control đang bật |
| `brand` | Icon nhấn, số lớn, vạch nhấn. Không làm nền nút có chữ nhỏ |
| `primary-soft` / `primary-soft-foreground` | Nền nhấn nhạt, mục đang chọn, badge cam |
| `primary-subtle` | Dòng bảng đang chọn, chip giá trị filter |
| `border` / `input` / `ring` | Hairline / viền ô nhập / focus |
| `destructive`, `success`, `warning`, `info` (+ `-foreground`, `-soft`, `-soft-foreground`) | Ngữ nghĩa trạng thái (mục 4.1) |
| `status-{draft,scheduled,sending,sent,paused,failed}` | Badge trạng thái batch (mục 4.2) |
| `chart-1..6` | Biểu đồ (mục 4.3) |
| `sidebar*`, `sidebar-hover` | Sidebar |
| `cream`, `peach`, `deep` | Nền onboarding / highlight chữ / overlay dialog |
| `rounded-lg`, `rounded-md`, `rounded-sm`, `rounded-card`, `rounded-full` | Bo góc (mục 6) |
| `shadow-card` / `shadow-float` | Độ nổi (mục 6) |
| `text-dense`, `tracking-title`, `tracking-display` | Bảng dày 13px / tiêu đề 18–24px / số ≥ 30px |
| `ease-standard`, `ease-emphasized`, `--motion-fast/base/slow` | Chuyển động (mục 7) |
| `--email-*` (`.email-canvas`) | Khung xem email, chỉ light (mục 9.3) |

## 4. Màu

### 4.1 Nguyên tắc
- **Một họ nhấn.** Nền trắng, khung phụ fog, chữ ink xanh mực, một họ cam.
- **Hai sắc cam, hai việc.** `brand` (cam của LP) cho icon nhấn, số lớn, focus. Nút chính dùng `primary` đậm hơn vì chữ trắng trên `brand` không đạt AA. Hover nút chính tối đi ở light, sáng lên ở dark: luôn "ra xa nền".
- **Mức chữ mờ nhất vẫn đạt AA.** `subtle-foreground` thay ink-3 của LP (3.77:1, trượt AA). `input` đậm hơn hairline để viền ô nhập đạt 3:1.
- **Họ ngữ nghĩa** (áp như nhau cho `destructive`, `success`, `warning`, `info`, `primary`):

| Token | Dùng cho |
|---|---|
| `X` | Nền đặc, icon, viền |
| `X-foreground` | Chữ trên nền đặc |
| `X-soft` | Nền nhạt |
| `X-soft-foreground` | Chữ và icon trên nền nhạt **và trên trắng** |

  Chữ cảnh báo luôn `warning-soft-foreground`, không bao giờ `warning`.

### 4.2 Trạng thái

| Batch | Token | Họ màu |
|---|---|---|
| Draft | `status-draft` | trung tính |
| Scheduled | `status-scheduled` | info-soft |
| Sending | `status-sending` | primary-soft |
| Sent | `status-sent` | success-soft |
| Paused | `status-paused` | warning-soft (gồm tự dừng do bounce/complaint, nhãn "Auto-paused") |
| Failed | `status-failed` | destructive-soft |

Campaign (Not started / Active / Ended / Archived) và template (Active / Inactive) dùng họ `-soft` qua `StatusBadge`. Badge luôn có chấm + chữ; chấm **tĩnh**, kể cả Sending (màu cam đã đủ báo "đang chạy", không animation lặp trên control).

### 4.3 Biểu đồ

| Token | Màu | Ghi chú |
|---|---|---|
| `chart-1` | cam | |
| `chart-2` | teal | Cặp gần nhất với cam khi mù màu |
| `chart-3` | blue | |
| `chart-4` | plum | |
| `chart-5` | gold | 2.16:1 trên trắng: luôn kèm nhãn hoặc legend |
| `chart-6` | rose | Bounce |

Mỗi chỉ số giữ một màu ở cả light và dark. Đã kiểm phân biệt khi mù màu (OKLab, mô phỏng deutan/protan).

### 4.4 Dark mode
- Nền, chữ, viền lấy bảng dark "neutral" của shadcn; độ sáng tăng dần: trang < card, popover, sidebar < muted.
- Giữ bản sắc Saella: cam làm nút chính (cam sáng hơn, chữ tối), focus cam, viền ô nhập đạt 3:1, màu biểu đồ, nền `-soft` chọn tay. `status-*` trỏ về họ màu nên tự đổi.
- Mọi cặp chữ/nền đạt AA trên **cả** nền trang và card.

### 4.5 Contrast các cặp chính

Con số contrast của từng token ghi trong `tokens.css`, cạnh giá trị. Mục này chỉ ghi các cặp **bị cấm hoặc có điều kiện**:

| Cặp | Quy tắc |
|---|---|
| `subtle-foreground` trên `primary-soft` | Không dùng: trượt AA |
| `primary` làm chữ trên `primary-soft` | Không dùng; thay bằng `primary-soft-foreground` |
| `warning`, `chart-5` làm chữ hoặc icon đứng một mình | Không dùng: dưới 3:1 trên trắng |
| `border` làm ranh giới duy nhất của control | Không dùng: chỉ để phân vùng; viền control dùng `input` (đạt 3:1) |
| Chữ soft trên nền soft (mọi họ), chữ trên nền đặc | Đạt AA ở cả light và dark, dùng tự do |

## 5. Chữ

Font **Geist** (`next/font`). Giao diện có ba ngôn ngữ: **English, Tiếng Việt, 简体中文** (PRD Language BR-RULE-LNG-03; app thật `lib/i18n/messages.ts`); tiếng Thái, Indonesia không phải ngôn ngữ giao diện. Chữ Trung dùng fallback CJK (PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC). Dấu tiếng Việt phải hiện bằng chính Geist, không rơi sang font khác (chưa kiểm, xem "Chưa chốt" ở `decisions.md`). Body bật `font-feature-settings: "ss01"` như LP. Số trong bảng và KPI: `tabular-nums`.

| Class | Cỡ / dòng | Weight | Dùng cho |
|---|---|---|---|
| `text-xs` | 12 / 16 | 500–600 | Chỉ badge, kbd, trục biểu đồ, bộ đếm, nhãn nhóm |
| `text-dense` | 13 / 18 | 400 | Ô bảng dày |
| `text-sm` | 14 / 20 | 400; nút, nhãn 500 | **Body mặc định**, ô nhập, nút, menu |
| `text-base` | 16 / 24 | 400 | Đoạn đọc dài (chat agent, mô tả) |
| `text-lg`, `text-xl` | 18, 20 | 600, `tracking-title` | Tiêu đề khối, dialog, card lớn |
| `text-2xl` | 24 / 32 | 500, `tracking-title` | Tiêu đề trang |
| `text-3xl`+ | ≥ 30 | 400, `tracking-display` | Số KPI, onboarding |

- Phân cấp bằng cỡ và màu trước, weight sau; hạn chế 700.
- Không viết hoa cả câu. Nhãn nhóm: 12px, 600, `muted-foreground`.

## 6. Khoảng cách, bo góc, viền

**Khoảng cách.** Thang 4px.

| Vị trí | Giá trị |
|---|---|
| Trong control | 8 / 12px |
| Giữa các trường form | 16px |
| Giữa các khối | 24 / 32px |
| Lề nội dung | 24px |

**Kích thước.**

| Phần tử | Cao |
|---|---|
| Nút, ô nhập (mặc định `h-8`) | 32px; nhỏ 28px; lớn 36px |
| Hàng bảng | 40px; dày 36px |
| Vùng bấm tối thiểu | 24×24px |

Nút `sm` / `xs` có chữ < 14px: chỉ dùng cho nút icon hoặc trong bảng.

**Bo góc.**

| Token | Giá trị | Dùng cho |
|---|---|---|
| `rounded-lg` (`--radius`) | 8px | Nút, ô nhập, popover, dropdown |
| `rounded-md` | 6.4px | Item menu, chip filter, nút icon nhỏ |
| `rounded-sm` | 4.8px | Checkbox, kbd |
| `rounded-card` | 12px | Card (`card.tsx`), dialog, khối Saella |
| `rounded-full` | pill | Badge, tag, avatar, chấm trạng thái |

**Viền và độ nổi.**

| Lớp | Cách tách |
|---|---|
| Card, bảng, panel, sidebar | Hairline 1px `border`, **không bóng** |
| Ô nhập, checkbox, select | Viền `input`; focus ring cam đặc 2px; lỗi viền `destructive` + câu lỗi dưới trường |
| Popover, menu, toast | `shadow-card` |
| Dialog, sheet, command palette | `shadow-float`; overlay `deep` 40% |

Không glow, không bóng màu.

## 7. Chuyển động và icon

**Chuyển động** chỉ để giải thích thay đổi trạng thái, không để trang trí.

| Việc | Thời lượng | Easing |
|---|---|---|
| Hover, đổi màu | 150–200ms | `ease-standard` |
| Mở popover, dialog, sheet | 200–300ms | `ease-emphasized` |
| Đang tải | skeleton hoặc spinner | |

- Không mang từ LP sang: vệt sáng trên nút, chữ cuộn khi hover, reveal khi cuộn, parallax.
- Mọi animation tắt khi `prefers-reduced-motion`. Không animation lặp vô hạn trên control.

**Icon.** Lucide, stroke 1.75–2; 16px trong control, 20px trong nav. Màu theo chữ đi kèm; icon nhấn dùng `brand`. Icon mang nghĩa phải đạt 3:1.

## 8. Component

Chỉ ghi phần Saella **khác** shadcn/ui; phần còn lại theo docs shadcn.

| Thư mục | Chứa | Quy tắc |
|---|---|---|
| `src/components/ui/` | Component shadcn gốc | Chỉ chỉnh theme qua token; được sửa class cho đúng DS, không đổi API |
| `src/components/saella/` | Component DS riêng Saella | Ghép từ `ui/`, chỉ dùng token |
| `src/components/layout/` | Khung app | |
| `src/components/features/` | Component tính năng dùng từ hai màn trở lên (dialog, bảng con…) | |
| `src/app/(app)/<màn>/` | Màn sản phẩm: `page.tsx` + `_components/` chỉ màn đó dùng | Dùng chung `AppShell`, đầu trang `PageHeader`. Không import `_components/` của màn khác: dùng từ hai màn trở lên thì đưa lên `features/` hoặc `saella/` |
| `src/lib/mock/` | Dữ liệu giả và kiểu dữ liệu dùng chung | Giá trị chung (TODAY, NOW, user hiện tại, quốc gia) chỉ khai báo ở `constants.ts` |
| `src/lib/format.ts`, `src/lib/time.ts` | Hàm định dạng, giờ theo múi giờ workspace | Không tự viết lại trong màn |

Component có file `<tên>.meta.ts` (khuôn `components/meta.ts`): đọc trước khi dùng, vì nó ghi biến thể nào dùng khi nào và tổ hợp bị cấm. Component mới hoặc hay bị dùng sai thì viết thêm meta.

Áp cho mọi component trong `ui/`, kể cả khi thêm mới:
- Focus `ring-2 ring-ring` (bản shadcn `ring-3 ring-ring/50` không đạt 3:1).
- Viền overlay và card `ring-border`; bóng theo mục 6.
- Bỏ các lớp `dark:bg-input/30`… vì token `.dark` đã xử lý.

### 8.1 Khác shadcn

| Component | Saella |
|---|---|
| Button | `default` = `primary`, hover `primary-hover`. `outline` viền `input`. `destructive` nền `destructive-soft` |
| Input, Textarea | Viền `input`; placeholder `subtle-foreground` |
| Select | Popover `shadow-card`; mục đang chọn có dấu check |
| Checkbox, Radio, Switch | Bật = `primary`, tắt viền `input`. Checkbox có trạng thái "chọn một phần" |
| Badge | Pill 12px, weight 600. Tông: trung tính, `brand`, `success`, `warning`, `info`, `destructive` (họ `-soft`) |
| Table | Header nền `muted`, chữ 13px 600 `muted-foreground`; dòng chọn `primary-subtle`; không đổi nền khi rê chuột |
| Tabs | Mặc định gạch dưới màu `brand`, tab chưa chọn `muted-foreground`. Chuyển chế độ xem (Rates / Counts) dùng `TabsList variant="default"` |
| Toggle, ToggleGroup | Mục đang chọn nền `primary-soft`. Chip chọn nhiều (series biểu đồ, lọc sự kiện) |
| Dialog, AlertDialog | Bo 12px, `shadow-float`, overlay `deep` 40%. `DialogContent` có `grid-cols-[minmax(0,1fr)]` để nội dung rộng cuộn bên trong |
| Sheet | `shadow-float`. Chi tiết contact, công ty |
| Alert | Thêm tông `info`, `success`, `warning`. Alert cho thông báo cần nằm lại; toast cho xác nhận ngắn |
| Toast (`sonner`) | Icon theo họ ngữ nghĩa; warning dùng `warning-soft-foreground` |
| Card | `rounded-card` (12px) |

### 8.2 Component Saella (`components/saella/`)

| Component | Vai trò |
|---|---|
| `StatusBadge` | Trạng thái campaign / template / batch: chấm tĩnh + chữ (mục 4.2) |
| `KpiStrip` | Mẫu KPI **duy nhất** (Overview, Campaigns, báo cáo batch, Billing): một dải liền khối chia bằng hairline, không icon trang trí. Ô có `href` thì bấm được; `detail` vào tooltip; tông `warning` / `danger` khi vượt ngưỡng |
| `RateCell`, `RateValue`, `rateKpi` | Cách duy nhất để hiện tỉ lệ email (`rate-meter.tsx`): "38.3% (466)", mẫu số trong tooltip, màu theo `RATE_BANDS`. `RateCell` cho bảng, `RateValue` nội dòng, `rateKpi` cho ô `KpiStrip` |
| `DataTable` | Bảng TanStack v9: sắp xếp, chọn nhiều + thanh thao tác phía trên, phân trang, loading, empty, mở rộng dòng (`renderExpanded`), thao tác hiện khi rê chuột (`revealOnRowHover`) |
| `FilterBar` | Ô tìm + menu lọc + chip giá trị + Clear all; điều khiển được từ ngoài (URL, agent) |
| `MultiSelect`, `TreeSelect`, `TagInput` | Chọn nhiều, chọn theo cây, nhập tag |
| `DatePicker`, `DateRangePicker`, `TimePicker` | Chọn ngày giờ thay ô native, theo múi giờ workspace (mục 9.8) |
| `ChartCard`, `Sparkline` | Khung biểu đồ, đường xu hướng nhỏ |
| `Stepper` | Form nhiều bước (mục 9.2) |
| `ApprovalCard`, `AgentSteps` | Đề xuất chờ duyệt, các bước agent đang chạy (mục 9.4) |
| `SaellaMini` | Gương mặt agent: nền tròn `primary-soft`, 20–96px, `state` idle / thinking |
| `CopyButton`, `LanguagePicker` | Copy giá trị (DNS record…), chọn ngôn ngữ |

**Đang bỏ (không dùng cho màn mới)**

| Component | Thay bằng | Ghi chú |
|---|---|---|
| `MetricCard` | `KpiStrip` | Overview đổi sang `KpiStrip` 2026-11-05 |
| `RateMeters` (thang 3 nấc) | `RateCell` / `RateValue` | Đã xoá 2026-11-05 |
| `TableFill` | Tuỳ chọn `fill` / `stickyHeader` của `DataTable` (chưa làm) | Tạm dùng cho bảng cao hết trang; nợ kỹ thuật vì chỉnh `DataTable` từ bên ngoài |

### 8.3 Khung app (`components/layout/`)

| Component | Vai trò |
|---|---|
| `AppShell` | Sidebar + header + panel agent kéo 320–900px |
| `AppSidebar` | Thu gọn thành icon, nhóm có nhãn, menu tài khoản có Light / Dark / System |
| `PageHeader` | Breadcrumb (tuỳ chọn), tiêu đề, một dòng ngữ cảnh, thao tác chính bên phải |
| `SearchCommand` | Command palette (Ctrl/⌘K) |
| `NotificationsMenu` | Thông báo |
| `AgentPanel` + nút nổi "Ask the agent" | Lối vào agent (mục 9.4) |
| `LeadsTabs` | Tab của nhóm Leads |
| `ThemeProvider` | Theme, mặc định light |

### 8.4 Trạng thái bắt buộc

Mọi component, gốc hay ghép, phải thiết kế đủ:

| Trạng thái | Cách thể hiện |
|---|---|
| hover | Nền `accent` hoặc `primary-hover`, 150–200ms |
| focus | `focus-visible` ring cam 2px |
| disabled | Opacity 50%, không hover |
| loading | Spinner hoặc skeleton, giữ nguyên kích thước, `aria-busy` |
| empty | Câu nói vì sao trống + một hành động tiếp theo |
| error | Viền + chữ `destructive`, thông báo nói cách sửa |

## 9. Pattern

### 9.1 Bảng dữ liệu + bộ lọc
**Dùng cho** Leads, Templates, Recipients, Settings. Quy tắc trình bày bảng: mục 2 "Bảng".
- **Cấu trúc.** `PageHeader` (tiêu đề `text-2xl`, nút chính bên phải) → `FilterBar` (ô tìm, menu lọc, chip giá trị như "Country: Vietnam" nền `primary-subtle` có ×; "Clear filters" chỉ hiện khi đang lọc; số kết quả cập nhật ngay) → bảng.
- **Luồng dữ liệu.** Lọc **trước** khi đưa vào bảng; bộ lọc nằm trên URL để agent và thông báo dẫn link được. Bảng chỉ sắp xếp, chọn, phân trang.
- **Chọn nhiều.** Thanh thao tác hàng loạt hiện **phía trên** bảng (nền `primary-subtle`); thanh lọc vẫn giữ.
- **Hình thức.** Bảng cao hết trang, tiêu đề dính khi cuộn. Cột số căn phải, `tabular-nums`. Icon sắp xếp chỉ ở cột đang sắp xếp.
- **Trạng thái.**

| Trạng thái | Hiển thị |
|---|---|
| Chưa có dữ liệu | Giải thích + nút tạo |
| Lọc không ra | Nút "Clear filters" |
| Lỗi tải | Banner `destructive-soft` + "Retry" |
| Đang tải | Skeleton đúng số cột |

### 9.2 Form nhiều bước
**Dùng cho** gửi batch, sending setup (domain, DNS, sender), onboarding.
- **Khung.** `Stepper` trên cùng; bước xong có tick `success`. Đáy: "Back" (`outline`, trái) và "Continue" (`default`, phải).
- **Mỗi bước một nhóm quyết định.** Kiểm lỗi khi rời trường, câu lỗi dưới trường. Quay lại bước trước không mất dữ liệu.
- **Bước cuối là Review.** Tóm tắt + kiểm tra trước khi gửi: dữ liệu người nhận thiếu thì chọn fallback hoặc loại ra; lỗi chặn nút gửi.
- **Bước kỹ thuật** (DNS record): `CopyButton` và trạng thái xác minh riêng từng record.

### 9.3 Trình soạn email
**Dùng cho** Templates editor, Write with AI.
- **Ba vùng.** Trái: khối, merge tag. Giữa: xem như người nhận. Phải: thuộc tính khối, kiểm nội dung.
- **Merge tag** hiện dạng chip, kể cả ngoài trình soạn (subject ở báo cáo batch và New batch, `SubjectText`). Tag lạ viền `destructive` và chặn "Mark active".
- **Kiểm subject** chấm ngay khi gõ, không chặn lưu. Chỉ liệt kê mục chưa đạt; mục đạt gộp thành "6 of 6 look good".
- **Write with AI.** Một lối vào duy nhất (tab ở panel phải). Kết quả vào vùng xem trước; người dùng chọn "Use" / "Try again", không ghi đè thẳng.
- **Màu email tách khỏi màu UI.** Màu template do người dùng chọn. Khung email luôn dùng bảng màu sáng `.email-canvas` (token `--email-*`, cố ý không có bản `.dark`), kể cả khi app ở dark: hiện đúng thứ người nhận thấy.

### 9.4 Agent đề xuất → người dùng duyệt
Theo PRD-03 (https://pgg-prd-lib.vercel.app/docs/saella-prd-aiagent).

| Phần | Thiết kế |
|---|---|
| **Lối vào** | Nút nổi "Ask the agent" trên mọi trang trừ `/agent`. Nền `primary-soft`, viền `primary/20`, có bóng vì là phần tử nổi; không bao giờ cam đặc, để nút cam đặc của trang vẫn là duy nhất. Mở panel phải, kéo 320–900px |
| **Ô nhập** | "Ask the agent…", có đính kèm, dòng nhắc "Writes wait for your approval". Đang trả lời thì nút Gửi thành Stop |
| **Tin nhắn** | Người dùng: bong bóng `muted` bên phải. Agent: không bong bóng, rộng hết để chứa bảng và thẻ duyệt. Lần đầu: Saella mini 56px + 3 gợi ý bấm được |
| **Đang làm** | `AgentSteps`: mỗi tool call một dòng (quay khi chạy, tick khi xong, đỏ khi lỗi), bấm để xem chi tiết |
| **Duyệt** | `ApprovalCard` cho bước bị chặn (chặn 2 hay 5 bước: chờ chốt, `decisions.md`). Dải "Needs your approval" nền `primary-soft`; thân = hành động + chi tiết + một dòng hệ quả; nút **Approve** / **Always allow this step** / **No**. Ghi chú "Always allow" nằm trong ⓘ cạnh tiêu đề Campaign flow |
| **Gửi thật** | Tick xác nhận đúng số người nhận trước khi Approve. Từ 100 người nhận thì gửi thử 20 trước |
| **Sau khi quyết** | Thẻ thu thành một dòng: tick + kết quả, hoặc "You said no. Nothing was changed." |
| **Approval queue** | Sheet gom việc chờ duyệt của mọi thread: trái danh sách, phải bản xem trước đúng thứ sẽ lưu/gửi |
| **Lỗi** | Mất kết nối: bong bóng `destructive` + "Try again". Quá số bước: "Stopped for safety…". Giới hạn tần suất: dòng có thời gian chờ |

### 9.5 Màn trống
- **Cấu trúc.** Icon → tiêu đề một dòng → câu giải thích → một nút chính (+ link phụ). Không dùng nhân vật chibi.
- **Phân biệt bốn loại**, mỗi loại một nội dung: chưa có dữ liệu lần đầu / lọc không ra / không có quyền / lỗi tải.

### 9.6 Master–detail (dữ liệu cha–con)
**Dùng cho** Campaigns (campaign → template).
- **Bố cục.** Tab trạng thái có đếm, cùng hàng với tìm kiếm + lọc. Dưới là khung chia đôi: trái 280px danh sách cha (mục chọn nền `primary-subtle` + vạch `brand` bên trái), phải là chi tiết (đầu trang, `KpiStrip`, bảng con có hàng tiêu đề).
- **Trạng thái chọn** ghi vào URL (`?c=<id>`). Bộ lọc làm mất mục đang chọn thì tự chọn mục đầu.
- **Dòng con phụ thuộc** (follow-up) nằm ngay dưới dòng gốc, thụt vào có ↳; dòng phụ là điều kiện.
- **Mở rộng dòng** (`renderExpanded`) chỉ khi dòng con ít và không cần đủ cột.

### 9.7 Số liệu
Ngưỡng và màu: mục 2 "Số liệu". Mục này quy định cách trình bày.

**Một nguồn dữ liệu.** KPI, biểu đồ và bảng chia nhỏ trong cùng một khối lọc tính từ cùng một tập dữ liệu đã lọc. Tỉ lệ tổng = tổng tử ÷ tổng mẫu, không lấy trung bình tỉ lệ từng dòng.

**KPI.** Luôn `KpiStrip`: tên, tỉ lệ, dòng đếm theo đúng mẫu số. Không icon trang trí.

| Tỉ lệ | Dòng đếm |
|---|---|
| Delivery, Bounce | "8,479 of 8,675 sent" |
| Open, Click, Reply, Unsub | "3,462 of 8,479 delivered" |

**Tỉ lệ trong bảng.**
- Mỗi tỉ lệ một cột số căn phải, để so và sắp xếp được. Số đếm xám trong ngoặc ngay sau: "12.2% (93)" (chốt 2026-11-05).
- Mẫu số trong tooltip (không dùng `title=` native). Không cần cột Delivered riêng.
- Thanh phần trăm (vd. Links) = phần của tổng thật, in kèm %; không so với dòng cao nhất hay với ngưỡng.

**Tương tác.**
- Ô số liệu ở báo cáo bấm được, mở danh sách đã lọc tương ứng.
- Lọc theo sự kiện bằng chip có đếm (`ToggleGroup`), không dropdown.

**Biểu đồ theo thời gian.**
- Mỗi cột là một khoảng thời gian, cộng gộp mọi campaign trong phạm vi lọc; không bao giờ một cột mỗi campaign.
- Cỡ khoảng theo độ dài khoảng lọc:

| Khoảng lọc | Mỗi cột |
|---|---|
| ≤ 31 ngày | ngày |
| ≤ 120 ngày | tuần (T2–CN) |
| dài hơn | tháng |

- Tỉ lệ của một cột = tổng tử ÷ tổng mẫu của khoảng đó. Dưới 20 lượt gửi: cột xám, tooltip "too few to judge".
- Mỗi khoảng một ô chia đều bề ngang; cột rộng tối đa 48px, nằm giữa ô. Mỗi cột một nhãn ngay dưới ô của nó; theo ngày thì chỉ số ngày, kèm tháng ở cột đầu và ngày 1 ("Oct 5 6 … Nov 1 2 3"). Khoảng không gửi: vạch xám 2px ở đáy.
- Ngày không có dữ liệu thì bỏ điểm, không vẽ về 0. Trục tự co theo chỉ số đang chọn.

**Biểu đồ theo campaign → template → batch.**
- Mỗi batch rơi vào cột của ngày gửi; open/reply về sau vẫn cộng về ngày gửi.
- Batch gửi trong 3 ngày gần nhất tô nhạt, tooltip "Still collecting".
- Rê vào cột liệt kê batch của cột (3 cái đầu + "+N more"); bấm cột mở danh sách batch.
- Bộ lọc Template phụ thuộc Campaign.

### 9.8 Thời gian và lên lịch
Bối cảnh: `PRODUCT.md` mục 2 (thị trường trải GMT+7 và GMT+8).
- **Hiển thị.** Mọi thời gian theo múi giờ của workspace, mặc định GMT+7 (`WORKSPACE_TZ`, `src/lib/time.ts`); không theo UTC hay máy người xem.
- **Ghi rõ múi giờ.** Thời gian gắn với một hành động (giờ gửi, lịch chạy, hạn) luôn kèm múi giờ: "9:00 AM GMT+7", không để "9:00 AM" trơn. Danh sách dày (log, cột thời gian trong bảng) ghi múi giờ một lần ở tiêu đề cột hoặc ⓘ.
- **Lên lịch gửi.** Một ô chọn múi giờ (app thật lưu `timezone` riêng cho từng automation). Mặc định theo nước đích của campaign khi campaign chỉ nhắm một nước, còn lại theo workspace. Không gửi theo giờ địa phương từng người nhận: trong SEA chênh lệch chỉ 1 giờ, không đáng độ phức tạp.

Các mục 9.9–9.14 viết ngày 2026-11-10 từ PRD (các module Contacts, Email Campaigns, AI Agent, Organization, Notification, Language, Billing, Onboarding) và app thật (Repo). Mỗi quy tắc ghi nguồn; chỗ PRD và app thật đều không nói thì để ở "Chưa chốt" của `decisions.md`, không tự quyết ở đây.

### 9.9 Chọn khung hiển thị

| Khung | Dùng khi | Ví dụ |
|---|---|---|
| **Trang riêng** | Đối tượng có nhiều phần hoặc tab, cần link để chia sẻ, hoặc là luồng dài | Chi tiết và trình soạn template, tạo batch, báo cáo batch, Leads (app thật: đều là trang) |
| **Sheet** (trượt bên phải) | Xem nhanh một dòng mà không rời danh sách | Chi tiết contact, công ty. PRD và app thật chưa có màn chi tiết; đây là cách của DS mới |
| **Dialog** | Tạo hoặc sửa ít trường; việc ngắn có điểm kết thúc rõ | Thêm/sửa contact, import (có bảng xem trước bên trong), tạo campaign, chọn template, share, automate, export (PRD Contacts CON-SEQ-003/004; app thật) |
| **AlertDialog** | Xác nhận trước hành động khó rút lại (mục 9.10) | Xoá, vô hiệu thành viên, chuyển admin |
| **Popover / DropdownMenu** | Lựa chọn nhỏ gắn với một nút | Thông báo, ngôn ngữ, menu ⋯ thao tác dòng, bộ lọc |
| **Màn khoá toàn trang** | Người dùng chưa được vào workspace | Domain email đã thuộc org khác: màn khoá, "không phải banner" (PRD Organization AC-ORG-J-02) |
| **Panel agent / modal giữa** | Agent | Panel phải 320–900px (AC-AG-C-02); modal giữa khi Guided start (AC-AG-GS-01) |

- Bấm dòng của đối tượng có trang riêng thì sang trang đó; thao tác phụ trên dòng nằm trong menu ⋯.
- Không mở dialog chồng dialog. Việc cần thêm bước thì chuyển thành trang hoặc dùng `Stepper` trong cùng dialog (**ĐX**).

### 9.10 Phản hồi và xác nhận

| Kênh | Dùng khi | Nguồn |
|---|---|---|
| **Toast** (`sonner`) | Báo kết quả ngắn của một hành động: đã lưu, đã xoá, lỗi không chặn việc khác | App thật: `message.*` là kênh chính |
| **Alert** trong trang | Tình trạng kéo dài, cần người dùng biết hoặc xử lý: chưa có sender được xác minh, vượt hạn mức gửi, không có quyền quản lý domain, tải lỗi + nút Retry | App thật: `EmailCampaignBoard`, `EmailBatchWizard`, `EmailDomainsManager`, `CompaniesTable` |
| **Lỗi dưới trường** | Giá trị nhập sai (mục 9.11) | |
| **Thông báo (chuông) + email** | Sự kiện xảy ra khi người dùng không ở màn đó: tự dừng gửi, domain lỗi hoặc xác minh xong | PRD Master v1.3.9, v1.4.8; app thật `domain-recheck.ts` |

**Câu chữ.** Lỗi nói chuyện gì xảy ra và cách sửa, không chung chung (PRD AC-EC-I-04); bị giới hạn tần suất thì nói rõ và cho biết thử lại khi nào (AC-CON-B-04, AC-AG-W-05); không đổ lỗi cho người dùng (BR-RULE-EM-16).

**Xác nhận trước khi làm** (`AlertDialog`, nút xác nhận `destructive`, nút huỷ `outline`). Câu hỏi nêu đúng hệ quả, không chỉ "Are you sure?":
- Xoá contact (PRD AC-CON-D-01), template, schedule hoặc flow.
- Xoá campaign: nói rõ template của nó bị xoá theo.
- Gỡ lời mời, vô hiệu thành viên (vô hiệu rút lại được, AC-ORG-U-04).
- Gỡ domain: liệt kê sender bị ảnh hưởng, nút "Remove anyway" / "Keep it" (app thật `EmailDomainsManager.tsx`).
- Chuyển quyền admin: gõ lại tên để xác nhận, kiểu GitHub (AC-ORG-U-06).
- Duyệt yêu cầu tham gia: nhắc lại dữ liệu nào sẽ bị xoá (AC-ORG-U-03).
- Gửi batch: bước Review nêu số người nhận cuối cùng và chi phí trước khi gửi (PRD Master v1.1.9, BAT-CREATE-001).

**Hoàn tác (undo).** PRD và app thật đều chưa có cho dữ liệu, nên không hứa "Undo" trong toast. Xoá campaign là xoá mềm (AC-EC-C-03) nhưng chưa có giao diện khôi phục.

**Thay đổi chưa lưu.** Rời trình soạn hoặc Settings khi còn thay đổi: hỏi **Save** / **Discard** / **Keep editing** (app thật `EmailDomainsManager.tsx`, `EmailTemplateEditor.tsx`).

### 9.11 Form và kiểm lỗi

- **Khi nào kiểm.** Kiểm khi rời trường (như 9.2) và khi bấm lưu; lỗi hiện ngay dưới trường, viền `destructive`. Bấm lưu khi còn lỗi thì đưa focus về trường lỗi đầu tiên (**ĐX**; app thật kiểm khi gõ, mặc định của antd).
- **Giới hạn độ dài.** Trường ngắn (tên, tiêu đề) dùng giới hạn cứng. Trường dài (hướng dẫn agent, 4,000 ký tự, AC-AG-I-01) **không cắt ngầm**: hiện bộ đếm "n / 4,000", vượt thì báo lỗi và khoá nút lưu (app thật `AgentSettingsSection.tsx`).
- **Giới hạn số lượng** (số domain, sender, thành viên, dòng import, dung lượng file): nói trước khi người dùng chạm tới, vd. "Up to 1,000 rows, 5 MB" ngay ở ô chọn file. Khi đã đầy, nút thêm khoá kèm tooltip nói lý do (app thật: nút Add domain).
- **Trùng lặp.** Contact trùng email + công ty thì **cập nhật** bản cũ, không tạo bản mới (PRD AC-CON-M-02, AC-CON-I-04); giao diện nói rõ điều này ở bước xem trước import và khi lưu.
- **Import.** Luôn có bước xem trước trước khi ghi (AC-CON-I-02); dòng lỗi hoặc bị bỏ qua được liệt kê kèm lý do.
- **Lưu lỗi.** Giữ nguyên dữ liệu đã nhập và ở lại bước hiện tại (PRD Onboarding AC-ONB-W-04).

### 9.12 Quyền và giới hạn

**Vai trò** (PRD Organization; app thật `UsersSection.tsx`, `template-permissions.ts`):
- Workspace: một **Admin** (BR-RULE-ORG-03) và các **Member**. Trạng thái thành viên: Invited, Requested, Active, Disabled.
- Template: **Owner**, **Admin** (mọi quyền, kể cả chuyển owner), **Shared** (sửa, lên lịch, gửi, copy), **Viewer** (xem và copy).

**Không được làm thì khoá, không ẩn** (PRD Master v1.3.2: "shown disabled, never hidden"; app thật cũng ghi rõ quy tắc này):
- Nút khoá (`disabled`) kèm tooltip nói **lý do và ai làm được**: "Only the owner (linh@…) can share", "Admin only". Nút `disabled` không nhận rê chuột, nên bọc nó trong một `span` để tooltip vẫn hiện.
- Viewer vẫn mở được template và các dialog liên quan, mọi chỗ ghi đều khoá, có nút **Copy** (AC-EC-TO-03).
- **Ngoại lệ được ẩn:** cả khu vực chỉ dành cho admin, vd. tab Users trong Settings (AC-ORG-U-01). Thay vì để trống, khu vực bị ẩn có một `Alert` nói vì sao (app thật: quản lý domain khi không có quyền).

**Giới hạn gói, credit, hạn mức gửi:**
- Hiện phần còn lại trước khi chạm giới hạn. Khi chạm: `Alert` nói chuyện gì xảy ra và cách mở khoá, vd. "Shared-domain monthly limit reached. Verify your own domain to send more." (app thật `api/email/send/route.ts`).
- Gửi vượt hạn mức ngày: phần dư dời sang ngày sau, không tính là lỗi (AC-EC-W-03); giao diện ghi rõ "deferred", không tô đỏ.
- Hết credit: PRD chưa định giao diện (xem "Chưa chốt").

### 9.13 Định dạng, cắt chữ, ngôn ngữ

**Ngôn ngữ** (PRD Language):
- Thứ tự chọn: cài đặt của người dùng → ngôn ngữ trình duyệt → English (BR-RULE-LNG-01). Chuỗi chưa dịch rơi về English (BR-RULE-LNG-04).
- Nội dung campaign và email **không bao giờ tự dịch** (BR-LNG-02). Agent trả lời theo ngôn ngữ tin nhắn gần nhất của người dùng (EC-LNG-01).
- Thiết kế cho chữ dài hơn tiếng Anh: tiếng Việt thường dài hơn. Nút, tab, cột không đặt bề rộng cố định theo chữ tiếng Anh; nhãn dài thì xuống dòng hoặc cắt theo quy tắc dưới đây, không chồng lên nhau.

**Ngày giờ.** Theo mục 9.8. Chỉ format qua helper chung (`src/lib/time.ts`), không tự viết format trong màn; app thật dùng 5 kiểu format khác nhau, DS mới chỉ một bộ. Thông báo và thread agent dùng thời gian tương đối ("7 h ago", PRD Notification, AC-AG-T-02).

**Số.** Dấu phẩy ngăn nghìn: "2,500". Tiền: USD, hai chữ số thập phân (PRD Billing). Badge đếm quá 9 hiện "9+" (PRD Notification).

**Chưa biết, chưa có.** Không bao giờ hiện "0" cho thứ chưa biết (PRD Master v1.6.8; mục 2 "Bảng"). DNS chưa kiểm hiện "Unknown", không hiện "Missing" (EC-EC-33). Dưới 20 lượt gửi: mục 2 "Số liệu".

**Che thông tin.** Email, số điện thoại, website của công ty bị che đến khi mở khoá (PRD Contacts AC-CON-B-02). Việc che làm ở server (BR-RULE-CON-01); giao diện chỉ hiện chuỗi đã che, kèm hành động Unlock và chi phí.

**Cắt chữ.**
- Một dòng, "…" ở cuối, tooltip hiện đủ khi rê chuột hoặc Tab tới (app thật `CompaniesTable.tsx`).
- Cột tên chính không bị bóp khi thêm cột; dòng phụ trong bảng cắt trước, tên cắt sau.
- URL dài cắt ở giữa, giữ tên miền và phần cuối (**ĐX**).

### 9.14 Việc chạy lâu

| Việc | Hiển thị | Nguồn |
|---|---|---|
| **Import contact** | Trong dialog: tiến độ theo từng dòng (đang lưu, xong, lỗi). Không đóng được khi đang lưu; xong thì tóm tắt "Saved X, failed Y" + danh sách lỗi. Chạy lại bỏ qua dòng đã lưu. Đóng trình duyệt là dừng: nói rõ điều này khi đang chạy | PRD CON-SEQ-004; app thật `EmailContactsList.tsx` |
| **Xác minh domain** | Tự kiểm ở nền, kèm nút "Re-check"; trạng thái riêng từng DNS record; không chặn danh sách (AC-EC-D-03/04, AC-EC-DV-03). Xong hoặc lỗi thì báo qua chuông | PRD Email Campaigns; app thật `domain-recheck.ts` |
| **Gửi batch** | Xếp hàng xong chuyển sang báo cáo; báo cáo hiện số theo trạng thái (BAT-VIEW-001). Tự dừng thì báo qua chuông + email cho admin | PRD Email Campaigns, Master v1.4.8 |
| **Agent** | Danh sách bước chạy, mỗi bước có thời gian (AC-AG-S-02/03); sau 15 giây chưa phản hồi thì hiện cảnh báo (AC-AG-T-05) | PRD AI Agent |
| **Export** | Dialog chọn số dòng (có trần), tải xuống ngay, toast kết quả | App thật `CompaniesExportButton.tsx` |

- Không hứa "we'll notify you when done" cho import và export: PRD và app thật chưa có thông báo cho hai việc này.
- Việc chạy quá lâu hoặc hết giờ: nói cho người dùng biết, không để họ chờ mãi (PRD Master v1.4.8, EC-AG-28).

### 9.15 Chữ trên màn (chốt 2026-11-10)
Lỗi hay gặp: agent đọc PRD và code rồi đưa hết lên màn, làm màn rối và che mất thông tin chính. PRD và code là để hiểu **cách màn hoạt động**, không phải danh sách thứ cần hiện.

**Phép thử cho mỗi chữ trên màn:** "người dùng **làm gì** với thông tin này?" (quyết định, bấm, so sánh, sửa). Không trả lời được thì bỏ; trả lời được nhưng hiếm khi cần thì đưa vào tooltip, ⓘ, sheet chi tiết hoặc trang con.

| Không hiện | Thay bằng |
|---|---|
| Dữ liệu thô của hệ thống: prompt, ID, mã lỗi, JSON, tên API, tên biến, tên bảng | Tên người dùng hiểu ("Question to the agent"); chi tiết thô chỉ trong sheet chi tiết nếu thật sự cần |
| Giải thích cách hệ thống tính hoặc chạy ("Rates are computed over delivered…") | Không ghi; cần thì một câu trong ⓘ |
| Quy tắc nghiệp vụ viết thành câu ("Only the owner can share…") đặt sẵn trên màn | Thể hiện bằng UI: nút khoá + tooltip khi người dùng chạm tới (mục 9.12) |
| Cùng một số liệu nói 2–3 lần (thẻ KPI + chip + bảng) | Nói một lần, ở chỗ người dùng nhìn đầu tiên |
| Khối chỉ có một mục (vd. "By member" khi workspace có một người) | Bỏ khối; hiện lại khi có từ hai mục |
| Giờ có giây, ngày dạng số "11/4/2026" | Mục 9.13: "Nov 4, 2:28 PM" |
| Nhãn ghép nhiều thứ ("Campaign, Template, Email draft") | Một nhãn chính; phần còn lại vào dòng phụ hoặc chi tiết |

**Giới hạn chữ:**
- Mô tả dưới tiêu đề trang: tối đa **một dòng**, chỉ khi tiêu đề chưa đủ rõ; thường thì bỏ.
- Mỗi dòng bảng tối đa hai tầng chữ (mục 2); dòng phụ không lặp lại cột khác.
- Nhãn nút: động từ + đối tượng, 1–3 từ ("Export report", không "Click here to export your report").
- Màn trống: tiêu đề một dòng + một câu (mục 9.5).

**Ưu tiên trên một màn:** một câu hỏi chính của người dùng, tối đa ba thông tin chính trả lời câu hỏi đó ở phần trên màn; mọi thứ khác lùi xuống dưới hoặc vào chi tiết.

## 10. Kiểm tra trước khi báo xong

**Token và trạng thái**
- [ ] Chỉ class từ token; chữ trên nền `*-soft` dùng `*-soft-foreground`.
- [ ] Đủ trạng thái mục 8.4. Loading giữ nguyên layout; empty và error có câu giải thích + hành động tiếp theo.

**Truy cập**
- [ ] Body ≥ 14px, bảng dày ≥ 13px, 12px chỉ cho badge, kbd, trục. Số dùng `tabular-nums`.
- [ ] Chữ ≥ 4.5:1; viền control, icon mang nghĩa, focus ≥ 3:1.
- [ ] Focus thấy được trên mọi phần tử tương tác; control có nhãn (`aria-label` cho nút chỉ có icon); vùng bấm ≥ 24×24px.

**Hiển thị**
- [ ] Chụp 1440px light + dark (`scripts/screenshot.mjs`, lưu vào thư mục tạm): không cuộn ngang, dòng phụ không bị cắt, cột tên không bị bóp.
- [ ] **Lượt cắt gọt chữ** trên ảnh chụp, theo mục 9.15: rà từng chữ bằng phép thử "người dùng làm gì với nó?"; bỏ dữ liệu thô, câu giải thích logic, số liệu lặp, khối chỉ một mục. Có thể dùng skill `distill` (bớt thành phần thừa) và `clarify` (sửa câu chữ). Báo lại những gì đã bỏ.

**Kỹ thuật**
- [ ] Typecheck và lint sạch; console không lỗi, không warning (kể cả hydration). Đổi nhiều file thì khởi động lại `npm run dev` rồi kiểm lại.

## 11. Tham chiếu

Nguồn ngoài để học hỏi (chốt 2026-11-10). Không ghi đè quy tắc Saella; mỗi nguồn chỉ dùng đúng việc ghi bên cạnh. Nền của Saella không nằm ở đây: style là `tokens.css` (mục 3), component là shadcn (mục 8).

| Khi nào | Nguồn | Học gì |
|---|---|---|
| Hay dùng, khi dựng màn | **Studio Admin** (bản clone chỉ đọc `D:\Workspace\Saella\Studio Admin`, demo https://studio-admin.arhamkhnz.com) | Bố cục, spacing, cấu trúc trang. Dựng lại bằng component + token Saella; không chép CSS, màu, `components/ui/` |
| Hay dùng, khi dựng màn | **Đối thủ** (Mailchimp, Apollo, HubSpot, Clay, Unify, Hunter, Buffer, qua Mobbin) | Luồng nghiệp vụ; ghi ở `01 Docs/Research/Competitor.md` |
| Chỉ khi cần | **saella.ai** (source `D:\Workspace\Saella\Saella LP`) | Thêm token mới cho hợp brand, tài sản brand (logo, chibi, Saella mini), giọng văn |
| Chỉ khi cần | Shopify Polaris | Empty state, UI copy |
| Chỉ khi cần | IBM Carbon | Bảng dày, nhãn nội dung AI |
