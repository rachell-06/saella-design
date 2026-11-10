# DESIGN.md: Saella Platform

Quy tắc và pattern giao diện của app Saella: **làm thế nào**. Vì sao làm vậy và cho ai: `PRODUCT.md`. Giá trị màu, cỡ, bóng: `tokens.css` (file này chỉ ghi vai trò, không chép giá trị). Bản đồ đầy đủ các tài liệu: `CLAUDE.md`.

Số mục trong file này được code và docs trích dẫn (`DESIGN.md §2`, `PATTERNS.md §9.7`…): **thêm mục mới thì đánh số tiếp, không đánh số lại**.

**Tra nhanh: đang làm gì thì đọc mục nào.** "PATTERNS 9.x" là mục trong `PATTERNS.md`.

| Đang làm | Đọc |
|---|---|
| Bất kỳ màn nào | Mục 2, rồi mục 10 trước khi báo xong |
| Bảng, danh sách, bộ lọc | Mục 2 "Bảng", PATTERNS 9.1 |
| Số liệu, tỉ lệ, biểu đồ | Mục 2 "Số liệu", PATTERNS 9.7 |
| Mở chi tiết, tạo mới: trang, sheet hay dialog | PATTERNS 9.9 |
| Lưu, xoá, báo thành công hoặc lỗi | PATTERNS 9.10 |
| Form, trường nhập | PATTERNS 9.11 (một bước), 9.2 (nhiều bước) |
| Nút người dùng không được bấm, giới hạn gói | PATTERNS 9.12 |
| Ngày giờ, số, chữ dài, ngôn ngữ | PATTERNS 9.8, 9.13 |
| Import, xác minh domain, gửi batch, export | PATTERNS 9.14 |
| Màn trống | PATTERNS 9.5 |
| Viết chữ trên màn: tiêu đề, mô tả, nhãn, nội dung ô | PATTERNS 9.15 |
| Agent | PATTERNS 9.4 |

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
- Dữ liệu cha–con (campaign → template) dùng master–detail (`PATTERNS.md` 9.6).

**Bảng**
- Tối đa 2 tầng chữ mỗi dòng. Một cột một kiểu hiển thị: không lẫn badge với chữ.
- Không đổi nền khi rê chuột lên dòng (`TableRow` gốc đã bỏ hover). Thao tác dòng và checkbox hiện khi rê chuột hoặc Tab tới; bảng gọn có thể cho thao tác nổi đè lên cột cuối.
- Một trang chỉ một hàng tab gạch chân. Bộ lọc phụ có đếm bên dưới (vd. Total / New / Already saved ở Find companies) dùng chip `ToggleGroup`.
- Chỉ hiện nhãn trạng thái khi khác trạng thái bình thường; ngoại lệ: bảng template luôn có cột Status.
- Ô bảng không có số thì để trống (không "0%", không "–"). Ô KPI chưa có số thì hiện "–". Cả hai không bao giờ hiện "0" thay cho "chưa biết" (PRD Master v1.6.8). Chỉ phân trang khi dài hơn một trang.

**Số liệu**
- Tỉ lệ email (Delivery, Open, Click, Reply, Unsub, Bounce) là con số, chữ thường, không thanh, không thang nấc. Thanh chỉ dùng cho "phần của một tổng", vd. lượt bấm từng link (`PATTERNS.md` 9.7).
- Chỉ hai tỉ lệ có ngưỡng, lấy từ app thật (`HEALTH_THRESHOLDS`, Repo `src/lib/email/health.ts`, theo giới hạn AWS SES), khai báo một nơi ở `RATE_BANDS` (`components/saella/rate-meter.tsx`):

| Tỉ lệ | Cảnh báo | Nguy hiểm |
|---|---|---|
| Bounce | ≥ 5% | ≥ 10% (mức tự dừng gửi) |
| Delivery | < 90% | |

  Cảnh báo: chữ `warning-soft-foreground`; nguy hiểm: chữ `destructive-soft-foreground`; cả hai kèm icon và tooltip ghi ngưỡng. Open, Click, Reply, Unsub **không có ngưỡng nên không bao giờ tô màu**.
- Dưới 20 lượt gửi: số xám, không đánh dấu, tooltip "too few to judge".
- Nơi nào còn thanh `Progress`, độ dài thanh luôn bằng đúng con số.
- Mọi thời gian hiện theo múi giờ của workspace, mặc định GMT+7; giờ gắn với hành động luôn ghi kèm múi giờ (`PATTERNS.md` 9.8).

**Nội dung**
- Chỉ hiện chữ người dùng **dùng để làm gì đó**; logic nghiệp vụ thể hiện qua cách UI hoạt động, không viết thành chữ giải thích. Chi tiết: `PATTERNS.md` 9.15.
- Thông tin phụ vào ⓘ hoặc tooltip, tối đa 1–2 câu. Không đặt đoạn chú thích phương pháp cuối trang.
- Gọi là **agent**, không bao giờ "assistant". Giọng chữ: `PRODUCT.md` mục 4.
- Nhân vật chibi toàn thân **chỉ** ở onboarding. Agent dùng Saella mini. Màn trống dùng icon.
- Dữ liệu mẫu: tên người, công ty hư cấu, không dùng khách thật (FTK, Vinex, VMA, Exquee, Aegis); số liệu chỉ minh hoạ, không phải claim marketing; đủ để hiện mọi trạng thái cần duyệt.

**Control**
- Component lấy từ `components/ui/` hoặc `components/saella/`; thiếu thì `npx shadcn@latest add`, không tự vẽ.
- Không control native: không `<input type="date|time">` (dùng `DatePicker`, `DateRangePicker`, `TimePicker`), không `<select>` thô.
- Không `<button>`, `<input>` thô ngoài `components/ui/`: nút dùng `Button` (chữ bấm được trong câu hoặc trong bảng: `variant="link"` + `h-auto border-0 p-0`), dòng bấm được dùng `Item` hoặc `ListRow`. Bọc thẻ thô bằng component shadcn qua `asChild` thì được. Hai ngoại lệ: `<input type="file">` ẩn, mở bằng một `Button`; khối nội dung chọn được trong trình soạn email (`email-body.tsx`).

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
| `--email-*` (`.email-canvas`) | Khung xem email, chỉ light (`PATTERNS.md` 9.3) |

**Token mới không phải màu** (bo góc, bóng, cỡ chữ, giãn chữ, easing, họ font) phải khai báo thêm trong `src/lib/utils.ts`, để `cn` biết nó xung đột với class nào. Thiếu bước này, `cn` giữ cả hai class xung đột hoặc xoá nhầm (từng làm mọi tiêu đề cột bảng mất cỡ `text-dense`). `tsconfig.json` trỏ `import { cn } from "cn"` của component shadcn về file này.

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

**Khung lồng nhau: ngoài bo lớn hơn trong.** Khối có viền đứng thẳng trên trang (khung bao bảng, khối thông tin, panel) bo `rounded-card` như Card. Khối có viền nằm **bên trong** một khung khác (dialog, card, bước wizard, panel chi tiết, tin nhắn agent) bo `rounded-lg`. Cùng là khung bao bảng nhưng bo theo vị trí, không theo nội dung.

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
| Table | Header nền `muted`, chữ 14px (cỡ chung của bảng) 600 `muted-foreground`; dòng chọn `primary-subtle`; không đổi nền khi rê chuột |
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
| `DatePicker`, `DateRangePicker`, `TimePicker` | Chọn ngày giờ thay ô native, theo múi giờ workspace (`PATTERNS.md` 9.8) |
| `ChartCard`, `Sparkline` | Khung biểu đồ, đường xu hướng nhỏ |
| `Stepper` | Form nhiều bước (`PATTERNS.md` 9.2) |
| `ApprovalCard`, `AgentSteps` | Đề xuất chờ duyệt, các bước agent đang chạy (`PATTERNS.md` 9.4) |
| `SaellaMini` | Gương mặt agent: nền tròn `primary-soft`, 20–96px, `state` idle / thinking |
| `CopyButton`, `LanguagePicker` | Copy giá trị (DNS record…), chọn ngôn ngữ |
| `Hint` | Tooltip ngắn cho mọi phần tử, thay `title=` native (`PATTERNS.md` 9.13) |
| `ListRow` | Một dòng chọn được trong danh sách bên trái của master–detail (campaign, thread agent, hàng chờ duyệt), dựng trên `Item` (`PATTERNS.md` 9.6) |
| `ChipRemove` | Nút × trong chip hoặc `Badge` để gỡ nó (giá trị lọc, tag, file đính kèm) |

**Đang bỏ (không dùng cho màn mới)**

| Component | Thay bằng | Ghi chú |
|---|---|---|
| `MetricCard` | `KpiStrip` | Đã xoá; số nào cần nổi bật thì vào một ô `KpiStrip` |
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
| `AgentPanel` + nút nổi "Ask the agent" | Lối vào agent (`PATTERNS.md` 9.4) |
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

Đã chuyển sang `PATTERNS.md` (cùng thư mục), giữ nguyên số 9.1–9.15. Mục cần đọc: bảng "Tra nhanh" ở đầu file này.

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
- [ ] **Lượt cắt gọt chữ** trên ảnh chụp, theo `PATTERNS.md` 9.15: rà từng chữ bằng phép thử "người dùng làm gì với nó?"; bỏ dữ liệu thô, câu giải thích logic, số liệu lặp, khối chỉ một mục. Có thể dùng skill `distill` (bớt thành phần thừa) và `clarify` (sửa câu chữ). Báo lại những gì đã bỏ.

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
