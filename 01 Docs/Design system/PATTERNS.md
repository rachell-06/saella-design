# PATTERNS.md: Saella Platform

Cách giải từng loại bài toán giao diện: bảng, form, số liệu, phản hồi, quyền, chữ trên màn. Quy tắc nền (quy tắc đã chốt, token, màu, chữ, component) ở `DESIGN.md`: đọc mục 2 của file đó trước. Không cần đọc hết file này: bảng "Tra nhanh" đầu `DESIGN.md` chỉ mục cần đọc cho từng việc.

Các mục giữ số 9.x (trước là mục 9 của `DESIGN.md`); code và docs trích dẫn dạng `PATTERNS.md §9.7`. **Thêm mục mới thì đánh số tiếp (9.16…), không đánh số lại.**

## 9.1 Bảng dữ liệu + bộ lọc
**Dùng cho** Leads, Templates, Recipients, Settings. Quy tắc trình bày bảng: DESIGN.md mục 2 "Bảng".
- **Cấu trúc.** `PageHeader` (tiêu đề `text-2xl` 24px, nút nhỏ bên phải) → `FilterBar` (ô tìm, menu lọc, chip giá trị như "Country: Vietnam" nền `primary-subtle` có ×; "Clear all" chỉ hiện khi đang lọc; số kết quả cập nhật ngay). Tên nút (designer 2026-11-18): dải chip và chân popover ghi "Clear all"; empty state "lọc không ra" ghi "Clear filters". → bảng.
- **Cuộn trong khung** (chốt 2026-11-14, DESIGN.md mục 2 "Bảng"): mọi bảng cuộn trong vùng riêng, tiêu đề dính; đếm và phân trang ("1–50 of N", "Show 50 more") nằm ở chân khung, ngay dưới vùng cuộn.
- **Luồng dữ liệu.** Lọc **trước** khi đưa vào bảng; bộ lọc nằm trên URL để agent và thông báo dẫn link được. Bảng chỉ sắp xếp, chọn, phân trang.
- **Chọn nhiều** (ĐX 2026-11-12, góp ý người dùng: thao tác chen vào đầu card làm rối). Thao tác hàng loạt nằm trong **thanh nổi** giữa, dưới bảng: `N selected | hành động | ✕` (✕ = Clear selection, nút icon có tooltip); nền `popover`, viền, `shadow-card`, control `size="sm"`, hiện bằng fade + trượt ngắn (tắt khi giảm chuyển động). Thanh là con flex dưới card nên bảng co lại, không che hàng phân trang, không đè nút "Ask the agent". Đầu card giữ nguyên (tiêu đề, tìm, Filter) dù có chọn hay không. Hành động chính của lựa chọn là nút cam đặc duy nhất của trang lúc đó; nếu `PageHeader` hoặc đầu card có nút cùng việc thì ẩn khi đang chọn để không lặp (vd. Export ở Leads › Unlocked, designer 2026-11-18). Bảng không còn thao tác hàng loạt thì bỏ cột checkbox và thanh. Component dùng chung: `SelectionBar` (`components/saella/selection-bar.tsx`, khe `children` cho hành động). Mẫu: Find companies `N selected | Unlock · X credits | ✕`; Unlocked `Export` (mở dialog xuất file, mục 9.14); Self-upload `Add tags | Remove tag | Delete` (Delete hỏi lại bằng `AlertDialog`). Còn lệch: `DataTable` `bulkActions` vẫn vẽ thanh trên bảng; Social › Posts có bản chép riêng, nên chuyển sang `SelectionBar`.
- **Chọn mọi kết quả qua các trang** (2026-11-14, New batch › Unlocked companies). Checkbox tiêu đề chỉ chọn **trang đang xem**. Khi cả trang đã chọn và còn kết quả ở trang khác, dòng đếm trên bảng hiện link "Select all N matching" (chọn mọi dòng khớp bộ lọc và ô tìm); có chọn thì kèm "Clear selection". Dòng đếm một dòng: "120 of 3,562 selected", không thêm ô số. Lựa chọn giữ nguyên khi đổi trang hoặc đổi bộ lọc. Leads (Find companies, Unlocked, Self-upload; designer 2026-11-18): link nằm ở chân bảng sau "1 – 20 of N"; số chỉ nói một lần: chân bảng không thêm "· N selected" (thanh chọn đã nói), đầu card không ghi số.
- **Không có cột ⋯ khi mọi thao tác dòng đã có chỗ khác** (người dùng chốt 2026-11-13): bấm dòng mở sheet, thao tác chính nằm ngay trong ô (vd. nút khoá Unlock ở Find companies) thì bỏ menu ⋯. Bảng còn thao tác chỉ có trong menu (Edit, Delete ở Self-upload) thì giữ.
- **Hình thức.** Bảng cao hết trang, tiêu đề dính khi cuộn. Mọi cột căn trái, kể cả cột số (vẫn `tabular-nums`), cả tên cột lẫn ô; mũi tên sắp xếp nằm cạnh tên cột, bên trái. Chỉ cột thao tác dòng (⋯, nút icon cuối hàng) căn phải; cột checkbox giữ nguyên (designer chốt 2026-11-13). Icon sắp xếp chỉ ở cột đang sắp xếp.
- **Bảng xếp hạng theo chỉ số** (leaderboard, người dùng yêu cầu 2026-11-12). Menu chỉ số mở đầu bằng "All metrics" và là mặc định: thứ tự mặc định, không tô cột nào. Chọn một chỉ số thì cả cột đó (tiêu đề + ô) phủ nền `primary-soft/40` (trong suốt để nền rê chuột của dòng vẫn thấy), tiêu đề chữ `primary-soft-foreground` kèm mũi tên ↓ (Highest) hoặc ↑ (Lowest), `aria-sort` trên tiêu đề. Số ở cột đó in đậm. Xếp theo đúng giá trị hiện ở cột (Highest giảm dần, Lowest tăng dần) để cột đọc theo thứ tự; dòng dưới ngưỡng mẫu không xếp hạng mà nằm trong "Not enough data to rank yet" (người dùng chốt 2026-11-12). Trên Overview chỉ hiện top 3 của thứ hạng hiện tại, thêm link "View all" (ghost, h-7) khi còn dòng; tiêu đề thẻ không có dòng chữ phụ, không giải thích ngưỡng mẫu (luật ngưỡng vẫn áp, người dùng chốt 2026-11-12); bấm cả dòng để lọc hoặc mở.
- **Một bảng chỉ ở một tab** (người dùng chốt 2026-11-12). Bảng dùng chung cho nhiều tab của cùng màn (vd. Deliverability by recipient domain ở Overview) chỉ đặt ở tab hợp nhất. Tab khác chỉ hiện một Alert `warning` ngắn (≤12 từ) khi bảng đó có dòng bị tô theo ngưỡng 9.7, kèm nút "View in <tab>" chuyển tab, giữ bộ lọc, cuộn tới bảng. Không có gì bị tô: không hiện gì.
- **Dòng có trang chi tiết thì bấm cả dòng để mở** (người dùng chốt 2026-11-11): `DataTable` `onRowClick` + `activeRowId`. Dòng có con trỏ tay và nền khi rê chuột (không gạch chân tên), dòng đang mở giữ nền chọn. Tên vẫn là nút thật cho bàn phím. Bấm vào control trong dòng (checkbox, menu, link) không mở.
- **Trạng thái: tab hay Filter** (người dùng chốt 2026-11-12). Tab khi người dùng hay chuyển giữa các trạng thái và cần thấy số của từng trạng thái ngay. Đưa vào Filter (mục đầu, một lựa chọn, mặc định All, kèm số mỗi lựa chọn) khi màn thường xem tất cả cùng lúc, như Campaigns. Status khác All thành chip như các bộ lọc khác và tính vào số trên nút Filter. Màn có mặc định khác All (Leads: Active, designer 2026-11-17): chỉ giá trị mặc định là im lặng; bỏ chip Status thì quay về mặc định, chọn "Any status" thì thành chip "Status: Any" và được đếm.
- **Bộ lọc gọn** (người dùng chốt 2026-11-12). Popover Filter mỗi mục một control có nhãn ở trên (Select cho một lựa chọn, `MultiSelect` cho nhiều lựa chọn), không trải danh sách checkbox ra, để popover chỉ vài dòng + chân Clear all / Done. Ngoại lệ: mục chỉ có **2–3 lựa chọn** thì hiện thẳng ra để bấm (checkbox hoặc chip bật/tắt), không giấu vào dropdown; từ 4 lựa chọn trở lên mới gom thành một control.
  Ô tìm không thành chip: chữ trong ô đã nói đang tìm gì (designer 2026-11-18, Leads). Spec chung (designer 2026-11-13, dựng một lần trong `components/saella/filter-popover.tsx`; màn không tự style):
  - **Nút:** `FilterPopover`, outline "Filter" + `ListFilterIcon` + badge số. Cao bằng ô tìm bên cạnh: thanh công cụ trang h-8 (`size="default"`), đầu card h-7 (`size="sm"`); chữ luôn 14px.
  - **Popover:** w-80, thân p-4, các mục cách nhau gap-4; chân Clear all (ghost, sm) trái, Done (outline, sm) phải.
  - **Mục:** nhãn ở trên (`Label`, 14px/500, `FilterField`), cách control gap-2. Mọi control h-8, chữ 14px; `FilterSelect`, `FilterMultiSelect`, `TreeSelect` có trigger giống hệt (viền, bo, chevron muted, "+N" badge brand); `MultiSelect` hiện bao nhiêu lựa chọn vừa ô thì hiện ("fair, hotel, distributor"), phần không vừa mới gom vào "+N" (2026-11-14); chưa chọn thì "Any …"/"All" màu `subtle-foreground`. Số mỗi lựa chọn là "(n)" muted (`FilterOption.count`). Dòng trong dropdown cao 28px, bo `rounded-md`.
  - **2–3 lựa chọn:** `FilterCheckList` (nhiều) hoặc `FilterRadioList` (một), xếp ngang.
  - **Thứ tự mục:** trạng thái trước, rồi các lựa chọn đơn khác, rồi chọn nhiều; danh sách checkbox ngang không phải trạng thái để cuối.
  - **Chip dưới thanh công cụ:** `FilterChips`: chip nền `primary-subtle` viền `primary-soft`, `rounded-md`, h-6, "Nhãn: giá trị ×" (nhiều giá trị: giá trị đầu + "+N", tooltip phần còn lại; nhiều chip cùng nhãn thì nhãn ghi một lần: "Tag: [fair ×] [hotel ×]", 2026-11-14). Lọc nhiều tag ở Leads › Self-upload là "có đủ tất cả tag" (2026-11-14), cách nhau gap-2, rồi Clear all (ghost, sm). Màn có điểm reset khác (New batch: "Reset to campaign") truyền `action`, cùng kiểu nút.
- **Tag trạng thái có cột riêng** (người dùng chốt 2026-11-11). Badge trạng thái (Active, Disabled, Invited, Paused…) nằm trong cột "Status" riêng, cùng vị trí ở mọi dòng, không chen cạnh tên hay email. Dòng không có trạng thái đặc biệt vẫn hiện badge mặc định (vd. "Active") để cột đồng nhất. Không lặp badge khi tab hoặc bộ lọc đang chọn đã nói trạng thái đó (vd. tab "Active" ở Campaigns: thẻ không hiện "Active"). Thẻ campaign không có badge trạng thái ở mọi chế độ xem, kể cả All (người dùng chốt 2026-11-12): trạng thái chỉ lọc qua Filter. Ngoại lệ đi cùng ô tên: tag là dữ liệu của chính tên (vd. "+3" ngành) và nhãn thuộc tính đánh dấu một dòng duy nhất, không phải trạng thái (vd. "Default" ở bảng Senders).
- **Bảng trong section card** (designer 2026-11-12, mẫu Studio Admin "Recent Leads"; đầu tiên ở template detail). Hai tầng: card có padding riêng → đầu card (tiêu đề, mô tả ≤1 dòng nếu cần; thao tác, bộ lọc, tìm ở bên phải) → bảng nằm trong khung riêng `rounded-lg border` bên trong padding của card, không tràn sát mép card. Hàng tiêu đề bảng nền token `--table-head` (`bg-table-head`, trung tính ấm theo tông primary: #f3ece3 sáng, #4a3e32 tối; đục để dòng cuộn đi dưới; không dùng `bg-muted`/xám). Mặc định cho **mọi bảng**: `TableHeader` (components/ui/table.tsx) đã có `bg-table-head` (2026-11-13). Bảng dài: khung có chiều cao tối đa, cuộn bên trong, tiêu đề dính; chân bảng "Showing N of M" là chữ nhạt dưới khung.
- **Trạng thái.**

| Trạng thái | Hiển thị |
|---|---|
| Chưa có dữ liệu | Giải thích + nút tạo |
| Lọc không ra | Nút "Clear filters" |
| Lỗi tải | Banner `destructive-soft` + "Retry" |
| Đang tải | Skeleton đúng số cột |

## 9.2 Form nhiều bước
**Dùng cho** gửi batch, sending setup (domain, DNS, sender), onboarding.
- **Khung.** `Stepper` trên cùng; bước xong có tick `success`. Đáy: "Back" (`outline`, trái) và "Continue" (`default`, phải).
- **Mỗi bước một nhóm quyết định.** Kiểm lỗi khi rời trường, câu lỗi dưới trường. Quay lại bước trước không mất dữ liệu.
- **Bước cuối là Review.** Tóm tắt + kiểm tra trước khi gửi: dữ liệu người nhận thiếu thì chọn fallback hoặc loại ra; lỗi chặn nút gửi.
- **Bước kỹ thuật** (DNS record): `CopyButton` và trạng thái xác minh riêng từng record.

## 9.3 Trình soạn email
**Dùng cho** Templates editor, Write with AI.
- **Hai khung như app thật** (2026-11-14). Trái: trình soạn (Letter: rich text TipTap; Design: khối, sửa chữ ngay trên email). Phải: xem như người nhận, luôn hiện. Không có thẻ thuộc tính khối: chữ sửa tại chỗ, ảnh chọn / kéo thả / dán ngay trên khối, alt text và link nút mở popover từ thanh nổi của khối.
- **Email trước tiên** (designer 2026-11-14). Mở trình soạn là thấy ngay email ở màn đầu (1440×900: mép trên khung email ≤ ~420px; 1366×768 vẫn thấy). Trên email chỉ còn: một dòng tóm tắt campaign · sender (Details để mở tên, campaign, sender), dòng Subject, Preheader, kiểm subject một dòng, thanh công cụ. Kiểm nội dung là nút "N to fix before Mark active" trên dòng trạng thái dưới tiêu đề, mở danh sách; chọn một mục thì nhảy tới trường hoặc khối. Không đặt khối nào đẩy email xuống khi chọn khối.
- **Thứ tự và thêm khối** (2026-11-14). Kéo bằng tay nắm trên thanh nổi của khối đang chọn (không kéo từ chữ đang sửa), vạch cam ở chỗ thả, Undo trong toast; Alt+↑/↓ cũng di chuyển và đọc vị trí mới. Thêm khối: nút "Add block" trên thanh công cụ (sau khối đang chọn hoặc cuối), "+" ở khe giữa hai khối, "Add a block below" trên thanh nổi; khối chữ mới nhận con trỏ ngay.
- **Merge tag** hiện dạng chip, kể cả ngoài trình soạn (subject ở báo cáo batch và New batch, `SubjectText`). Tag lạ viền `destructive` và chặn "Mark active".
- **Kiểm subject** chấm ngay khi gõ, không chặn lưu. Chỉ liệt kê mục chưa đạt; mục đạt gộp thành "6 of 6 look good". Kiểm nội dung không lặp các mục này; nó chỉ giữ phần chặn Mark active (thiếu subject, merge tag lạ) và nội dung email (2026-11-18). Ảnh trong danh sách đánh số theo thứ tự giữa các ảnh ("Image 2", một ảnh thì "The image"); chọn mục là chọn đúng ảnh đó, cả ở Letter.
- **Write with Saella.** Một lối vào: nút trên thanh công cụ trình soạn, mở hộp thoại (một ô nhập mỗi lúc, ảnh tham khảo trong ô). Bản nháp hiện trong hộp; người dùng chọn "Use this draft" / "Try again", không ghi đè thẳng; Undo trong toast.
- **Màu email tách khỏi màu UI.** Màu template do người dùng chọn. Khung email luôn dùng bảng màu sáng `.email-canvas` (token `--email-*`, cố ý không có bản `.dark`), kể cả khi app ở dark: hiện đúng thứ người nhận thấy.

## 9.4 Agent đề xuất → người dùng duyệt
Theo PRD-03 (https://pgg-prd-lib.vercel.app/docs/saella-prd-aiagent).

| Phần | Thiết kế |
|---|---|
| **Lối vào** | Agent chỉ có panel, không có trang riêng (bỏ `/agent` 2026-11-13; link cũ `/agent` quay về trang trước hoặc Overview và mở panel, designer 2026-11-18). Tên gọi trên mọi nút, mục menu: "Ask the agent" (không "Ask Saella"); icon là Saella mini, không ✨. Nút nổi "Ask the agent" trên mọi trang (kiểu nút: `DESIGN.md` mục 8, `AgentPanel`). Màn khác mở panel kèm câu hỏi đầu bằng `openAgent({ prompt })` (`features/agent-chat`), không dẫn link. Mở cửa sổ chat nổi góc phải dưới thay chỗ nút (400px, cao từ dưới thanh trên 0,5rem tới cách đáy 1rem; Expand lên 560px; `rounded-card`, viền, `shadow-float`, nền `popover`; Esc đóng; trang không co), bản panel ghim phải kéo 320–900px xem bằng `?agent=dock` (đang thử, `decisions.md` Chưa chốt) |
| **Đầu panel** | Saella mini + "Agent" + tiêu đề thread (14px `muted-foreground`; tên ngắn agent đặt khi trả lời xong lượt đầu, không phải nguyên câu hỏi đầu; chưa có tên thì không hiện dòng này, designer 2026-11-18) · Chat history · New chat · Expand (cửa sổ nổi) · Close. Không có menu Approvals (bỏ 2026-11-13): duyệt ở thẻ trong hội thoại. Chat history: mọi thread mới nhất trước, tối đa 50, mỗi dòng tiêu đề + Private/Company · thời gian (AC-AG-T-01/02), cuộn trong menu |
| **Ô nhập** | "Ask the agent…", có đính kèm (1 ảnh + 1 tài liệu, ≤ 5 MB, chỉ lượt này). Thanh dưới: kẹp giấy, nút Gửi; đang trả lời thì Gửi thành Stop |
| **Không chip duyệt** | Ô nhập không có chip duyệt (bỏ 2026-11-12, người dùng chốt): agent tự làm các bước, chỉ dừng ở bước gửi email bằng thẻ duyệt trong chat; thẻ có "Always allow" (bật/thu hồi, chỉ cho người đó, PRD-03 AC-AG-P-01..03). Không câu trấn an tĩnh trong ô nhập hay lời chào. |
| **Tin nhắn** | Người dùng: bong bóng `muted` bên phải. Agent: không bong bóng, rộng hết để chứa bảng và thẻ duyệt. Lần đầu: Saella mini 56px + 3 gợi ý bấm được |
| **Đang làm** | `AgentSteps`: mỗi tool call một dòng (quay khi chạy, tick khi xong, đỏ khi lỗi), bấm để xem chi tiết |
| **Duyệt** | `ApprovalCard` cho bước bị chặn (chặn 2 hay 5 bước: chờ chốt, `decisions.md`). Dải "Needs your approval" nền `primary-soft`; thân = hành động + chi tiết + một dòng hệ quả; nút **Approve** / **Always allow this step** / **No**. Thu hồi bằng "Ask me again" dưới bước đã chạy tự động |
| **Gửi thật** | Tick xác nhận đúng số người nhận trước khi Approve. Từ 100 người nhận thì gửi thử 20 trước |
| **Sau khi quyết** | Thẻ thu thành một dòng: tick + kết quả, hoặc "You said no. Nothing was changed." |
| **Always allow** | Bật bằng "Always allow this step" trên thẻ duyệt. Bước chạy tự động có dòng mờ "Ran without asking · Ask me again" dưới thẻ; "Ask me again" (link) thu hồi, agent lại hỏi (AC-AG-P-02) |
| **Lỗi** | Mất kết nối: bước đang chạy chuyển đỏ (status lỗi), Alert `destructive` "…Nothing was changed. 1 credit refunded." + "Try again" (số credit hoàn nằm trong Alert, designer 2026-11-18). Quá số bước: "Stopped for safety…". Giới hạn tần suất: dòng có thời gian chờ |

## 9.5 Màn trống
- **Cấu trúc.** Icon → tiêu đề một dòng → câu giải thích → một nút chính (+ link phụ). Không dùng nhân vật chibi.
- **Phân biệt bốn loại**, mỗi loại một nội dung: chưa có dữ liệu lần đầu / lọc không ra / không có quyền / lỗi tải.

## 9.6 Master–detail (dữ liệu cha–con)
**Dùng cho** Campaigns (campaign → template).
- **Bố cục.** Tab trạng thái có đếm, cùng hàng với tìm kiếm + lọc. Dưới là khung chia đôi: trái 280px danh sách cha (mục chọn nền `primary-subtle` + vạch `brand` bên trái), phải là chi tiết (đầu trang, `KpiStrip`, bảng con có hàng tiêu đề).
- **Trạng thái chọn** ghi vào URL (`?c=<id>`). Bộ lọc làm mất mục đang chọn thì tự chọn mục đầu.
- **Follow-up chỉ ở trang chi tiết template** (designer chốt 2026-11-13). Danh sách Templates và Campaigns không có dòng follow-up; xem và sửa lịch, follow-up ở thẻ Automation của trang template (hai tab Schedule / Follow-up: thẻ lịch gửi; bảng flow có dòng mở ra từng bước, đánh dấu "This template" ở bước của template đang xem). Tìm kiếm hay bộ lọc khớp một follow-up thì hiện template gốc của nó; số kết quả chỉ đếm template.
- **Automate nằm trong menu ⋯ của dòng** (designer 2026-11-16, ghi lại 2026-11-18): danh sách Templates và bảng template trong thẻ Campaigns giữ mục Automate trong menu ⋯, mở hộp Automate (cùng nội dung thẻ Automation); trên trang template, mục này cuộn tới thẻ Automation. Chỉ template active bấm được; template inactive thì mục khoá, lý do ghi ở cuối menu ("Mark it active in the editor to automate it."). Một icon cho Automate ở mọi nơi (`CalendarClock`).
- **Mở rộng dòng** (`renderExpanded`) chỉ khi dòng con ít và không cần đủ cột.

## 9.7 Số liệu
- **Dòng phụ dưới số KPI viết "X/Y đơn vị"** (người dùng chốt 2026-11-12): "8,479/8,675 sent", không "8,479 of 8,675 sent". Câu văn và tooltip vẫn viết chữ ("12 bounced of 120 sent").
- **Số dư credit chỉ ghi phần còn lại** (người dùng chốt 2026-11-12, ngoại lệ của quy tắc X/Y trên): "815 credits left", không "815/1,100", không "815 of 820". Vòng tròn ở sidebar tô phần đã dùng trong kỳ, số giữa vòng là % còn lại (khớp "N credits left"); còn dưới 20% thì vòng, số % và số dư màu `destructive` (designer 2026-11-16).
- **Dòng credit vào/ra** (người dùng chốt 2026-11-12): số dương (+1,000, hoàn credit) màu `success-soft-foreground`, số âm (−18) màu `destructive-soft-foreground`, giữ dấu +/− (dấu trừ thật "−"), `tabular-nums`. Chỉ dùng cho dòng chảy (bảng Usage, tóm tắt Credits used / added); số dư còn lại không tô màu.
Ngưỡng và màu: DESIGN.md mục 2 "Số liệu". Mục này quy định cách trình bày.

**Một nguồn dữ liệu.** KPI, biểu đồ và bảng chia nhỏ trong cùng một khối lọc tính từ cùng một tập dữ liệu đã lọc. Tỉ lệ tổng = tổng tử ÷ tổng mẫu, không lấy trung bình tỉ lệ từng dòng.

**KPI.** Luôn `KpiStrip`: tên, tỉ lệ, dòng đếm theo đúng mẫu số. Không icon trang trí.

| Tỉ lệ | Dòng đếm |
|---|---|
| Delivery, Bounce | "8,479 of 8,675 sent" |
| Open, Click, Reply, Unsub | "3,462 of 8,479 delivered" |

**Tỉ lệ trong bảng.**
- Mỗi tỉ lệ một cột số căn trái như mọi cột (9.1), `tabular-nums`, để so và sắp xếp được. Số đếm xám trong ngoặc ngay sau: "12.2% (93)" (chốt 2026-11-05).
- Mẫu số trong tooltip (không dùng `title=` native). Không cần cột Delivered riêng.
- Thanh phần trăm (vd. Links) = phần của tổng thật, in kèm %; không so với dòng cao nhất hay với ngưỡng. Sức khoẻ gửi thư dùng **vòng điểm 0–100** như app thật (công thức và dải màu theo app thật), không dùng thanh so với ngưỡng (người dùng chốt 2026-11-12).

**Tương tác.**
- Ô số liệu ở báo cáo bấm được, mở danh sách đã lọc tương ứng.
- Lọc theo sự kiện bằng **một dropdown** có đếm ("Opened · 1,266", mặc định "Everyone"), đặt cạnh Export và ô tìm; không bày hàng chip (người dùng chốt 2026-11-12, đổi từ chip).

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
- Biểu đồ số lượng (vd. Send volume): ngày không gửi vẽ 0 để đường liền (người dùng chốt 2026-11-12, như app thật). Biểu đồ tỉ lệ: khoảng không có mẫu thì bỏ điểm, không vẽ về 0. Trục tự co theo chỉ số đang chọn.

**Biểu đồ theo campaign → template → batch.**
- Mỗi batch rơi vào cột của ngày gửi; open/reply về sau vẫn cộng về ngày gửi.
- Batch gửi trong 3 ngày gần nhất tô nhạt, tooltip "Still collecting".
- Rê vào cột liệt kê batch của cột (3 cái đầu + "+N more"); bấm cột mở danh sách batch.
- Bộ lọc Template phụ thuộc Campaign.

## 9.8 Thời gian và lên lịch
Bối cảnh: `PRODUCT.md` mục 2 (thị trường trải GMT+7 và GMT+8).
- **Hiển thị.** Mọi thời gian theo múi giờ của workspace, mặc định GMT+7 (`WORKSPACE_TZ`, `src/lib/time.ts`); không theo UTC hay máy người xem.
- **Ghi rõ múi giờ.** Thời gian gắn với một hành động (giờ gửi, lịch chạy, hạn) luôn kèm múi giờ: "9:00 AM GMT+7", không để "9:00 AM" trơn. Danh sách dày (log, cột thời gian trong bảng) ghi múi giờ một lần ở tiêu đề cột hoặc ⓘ.
- **Lên lịch gửi.** Một ô chọn múi giờ (app thật lưu `timezone` riêng cho từng automation). Mặc định theo nước đích của campaign khi campaign chỉ nhắm một nước, còn lại theo workspace. Không gửi theo giờ địa phương từng người nhận: trong SEA chênh lệch chỉ 1 giờ, không đáng độ phức tạp.

Các mục 9.9–9.14 viết ngày 2026-11-10 từ PRD (các module Contacts, Email Campaigns, AI Agent, Organization, Notification, Language, Billing, Onboarding) và app thật (Repo). Mỗi quy tắc ghi nguồn; chỗ PRD và app thật đều không nói thì để ở "Chưa chốt" của `decisions.md`, không tự quyết ở đây.

## 9.9 Chọn khung hiển thị

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

## 9.10 Phản hồi và xác nhận

- **Màn hình thấp:** Dialog/AlertDialog cao tối đa `100dvh − 2rem`, nội dung cuộn bên trong, chân nút dính đáy nên nút luôn bấm được (`components/ui/dialog.tsx`, `alert-dialog.tsx`; lỗi người dùng báo 2026-11-12).

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

**Thay đổi chưa lưu.** Rời trình soạn hoặc Settings khi còn thay đổi: hỏi **Save** / **Discard** / **Keep editing** (app thật `EmailDomainsManager.tsx`, `EmailTemplateEditor.tsx`). Dùng `UnsavedDialog` + `useLeaveGuard` (`lib/leave-guard.ts`): chặn mọi đường rời trang (link, nút ← trên thanh trên, Back của trình duyệt, đóng tab). Thứ tự nút (chốt 2026-11-14): **Discard** đứng riêng bên trái; **Keep editing** + **Save** đứng cạnh nhau bên phải, Save là nút chính; mở hộp không hiện viền focus trên nút nào.

- **Chân hộp có từ 3 nút** (người dùng chốt 2026-11-11): Cancel tách sát mép trái (`sm:mr-auto`), các nút hành động gom bên phải, nút mạnh nhất ngoài cùng. **Ngoại lệ** (2026-11-18): hộp có một nút làm mất dữ liệu (Discard, Delete…) thì nút đó tách bên trái, Cancel/Keep editing đứng cạnh nút chính bên phải (như `UnsavedDialog`, Delete follow-up). Hộp 2 nút giữ nguyên: Cancel cạnh nút chính, cả hai bên phải.
- **Bấm ra ngoài là đóng** (người dùng chốt 2026-11-11): mọi Dialog và AlertDialog đóng khi bấm nền mờ hoặc Esc, tính như Cancel. Vì vậy "đóng" không bao giờ được làm thay đổi dữ liệu. **Ngoại lệ** (2026-11-18): đang lưu hoặc đang import thì chặn đóng (Esc, bấm ngoài, nút X) cho tới khi xong (9.14).

## 9.11 Form và kiểm lỗi

- **Khi nào kiểm.** Kiểm khi rời trường (như 9.2) và khi bấm lưu; lỗi hiện ngay dưới trường, viền `destructive`. Bấm lưu khi còn lỗi thì đưa focus về trường lỗi đầu tiên (**ĐX**; app thật kiểm khi gõ, mặc định của antd).
- **Giới hạn độ dài.** Trường ngắn (tên, tiêu đề) dùng giới hạn cứng. Trường dài (hướng dẫn agent, 4,000 ký tự, AC-AG-I-01) **không cắt ngầm**: hiện bộ đếm "n / 4,000", vượt thì báo lỗi và khoá nút lưu (app thật `AgentSettingsSection.tsx`).
- **Giới hạn số lượng** (số domain, sender, thành viên, dòng import, dung lượng file): nói trước khi người dùng chạm tới, vd. "Up to 1,000 rows, 5 MB" ngay ở ô chọn file. Khi đã đầy, nút thêm khoá kèm tooltip nói lý do (app thật: nút Add domain).
- **Trùng lặp.** Contact trùng email + công ty thì **cập nhật** bản cũ, không tạo bản mới (PRD AC-CON-M-02, AC-CON-I-04); giao diện nói rõ điều này ở bước xem trước import và khi lưu.
- **Import.** Luôn có bước xem trước trước khi ghi (AC-CON-I-02); dòng lỗi hoặc bị bỏ qua được liệt kê kèm lý do. Bước review (2026-11-12): số đếm nói một lần ở mô tả hộp (mới + cập nhật), lỗi là một cảnh báo có số dòng + tải file lỗi, lý do từng dòng nằm ở cột Result của bảng, dòng lỗi xếp lên đầu; không thêm dải số liệu hay chú thích cuối hộp. Dòng trùng trong file gọi một tên "Merged" ở cả bước review và màn kết quả; màn kết quả nói số lỗi một lần (ô Errors) + một dòng ngắn kèm "Download error file" (designer 2026-11-18).
- **Lưu lỗi.** Giữ nguyên dữ liệu đã nhập và ở lại bước hiện tại (PRD Onboarding AC-ONB-W-04).

- **Lỗi không đổi màu nhãn** (người dùng chốt 2026-11-11): chỉ viền ô nhập và dòng lỗi (`FieldError`) đỏ; nhãn giữ màu chữ thường.

## 9.12 Quyền và giới hạn

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
- **Seat** (designer 2026-11-18): 10 mỗi workspace, tính người active + invited (PRD Master v1.1.7; app thật `MAX_MEMBERS_PER_ORG`). Mọi hành động chiếm seat (Invite, Approve, Enable) khoá khi đủ, tooltip "All 10 seats are used."; yêu cầu tham gia chưa duyệt không chiếm seat.
- **Chưa có admin** (domain chưa ai claim, designer 2026-11-18): khu vực admin vẫn hiện, mọi quyết định cần admin khoá kèm "No admin yet. Verify the domain to become admin.", trên cùng là `Alert` dẫn sang Domain.
- **Lý do đúng nguyên nhân** (2026-11-18): khi việc bị chặn vì cấu hình (domain chưa xác minh), câu báo nói cấu hình đó và dẫn tới chỗ sửa ("Domain not verified: sending is off." + Go to Domain), không mượn câu của nguyên nhân khác (tỉ lệ bounce) và không đưa nút không sửa được (Resume).
- Hết credit: mục 9.18.

## 9.13 Định dạng, cắt chữ, ngôn ngữ

- **Tiêu đề trang luôn có dòng mô tả** (người dùng chốt 2026-11-12): `PageHeader` bắt buộc một dòng dưới tiêu đề: `description` (một câu ≤12 từ nói trang này để làm gì) hoặc, ở trang chi tiết, dòng thông tin riêng (badge trạng thái, chiến dịch…) qua `children`. Không thêm dòng chỉ lặp thứ đã có trên trang (vd. subject đã ở thẻ Content). Thẻ (card) bên trong thì không bắt buộc.
- **Không lặp thông tin:** breadcrumb chỉ liệt kê trang cha; tên trang đã là tiêu đề ngay dưới nên không lặp lại trong breadcrumb (`PageHeader`, người dùng chốt 2026-11-12).

**Ngôn ngữ** (PRD Language):
- Thứ tự chọn: cài đặt của người dùng → ngôn ngữ trình duyệt → English (BR-RULE-LNG-01). Chuỗi chưa dịch rơi về English (BR-RULE-LNG-04).
- Nội dung campaign và email **không bao giờ tự dịch** (BR-LNG-02). Agent trả lời theo ngôn ngữ tin nhắn gần nhất của người dùng (EC-LNG-01).
- Thiết kế cho chữ dài hơn tiếng Anh: tiếng Việt thường dài hơn. Nút, tab, cột không đặt bề rộng cố định theo chữ tiếng Anh; nhãn dài thì xuống dòng hoặc cắt theo quy tắc dưới đây, không chồng lên nhau.

**Ngày giờ.** Theo mục 9.8. Chỉ format qua helper chung (`src/lib/time.ts`), không tự viết format trong màn; app thật dùng 5 kiểu format khác nhau, DS mới chỉ một bộ. Thông báo và thread agent dùng thời gian tương đối ("7 h ago", PRD Notification, AC-AG-T-02).

**Số.** Dấu phẩy ngăn nghìn: "2,500". Tiền: USD, hai chữ số thập phân (PRD Billing). Badge đếm quá 9 hiện "9+" (PRD Notification).

**Chưa biết, chưa có.** Không bao giờ hiện "0" cho thứ chưa biết (PRD Master v1.6.8; DESIGN.md mục 2 "Bảng"). DNS chưa kiểm hiện "Unknown", không hiện "Missing" (EC-EC-33). Dưới 20 lượt gửi: DESIGN.md mục 2 "Số liệu".

**Che thông tin.** Email, số điện thoại, website của công ty bị che đến khi mở khoá (PRD Contacts AC-CON-B-02). Việc che làm ở server (BR-RULE-CON-01); giao diện chỉ hiện chuỗi đã che, kèm hành động Unlock và chi phí.

**Cắt chữ.**
- Một dòng, "…" ở cuối, tooltip hiện đủ khi rê chuột hoặc Tab tới (app thật `CompaniesTable.tsx`).
- **Tooltip luôn dùng `Hint`** (`components/saella/hint.tsx`, bọc Tooltip của shadcn), không dùng `title=` native: nó hiện chậm, không theo token, không mở bằng bàn phím. Hint mang thông tin cần thiết trên phần tử không bấm được (vd. icon "Email on file") thì thêm `tabIndex={0}`. Ngoại lệ duy nhất: chữ bị cắt dùng `title=` lặp lại đủ chữ.
- **Mục trong menu luôn một dòng** (người dùng chốt 2026-11-11): `DropdownMenuContent` rộng theo nội dung (`w-max`, tối đa 320px), không theo nút mở; nhãn mục ngắn để không phải xuống dòng.
- **Tooltip và ⓘ phải ngắn: người dùng không đọc đoạn dài** (người dùng chốt 2026-11-11). Tooltip (`Hint`): một câu, tối đa ~12 từ. ⓘ: tối đa 3 gạch, mỗi gạch một dòng ngắn (~6 từ), tổng ~20 từ; không tiêu đề lặp lại nhãn đã có. Chỉ giữ điều người dùng cần để quyết định hoặc tránh lỗi; bỏ cách hệ thống chạy, ngoại lệ hiếm, lịch sử. Dài hơn thì cắt bớt, đưa vào trang con hoặc link "Learn more", không nhồi vào ⓘ.
- Cột tên chính không bị bóp khi thêm cột; dòng phụ trong bảng cắt trước, tên cắt sau.
- URL dài cắt ở giữa, giữ tên miền và phần cuối (**ĐX**). Email cắt ở phần tên, luôn giữ "@tên miền" (designer 2026-11-18, bảng Leads). Ô bảng không đặt `max-w` cố định cho chữ: bảng `table-fixed` chia bề rộng cột, chữ lấp đầy cột rồi mới cắt.

## 9.14 Việc chạy lâu

| Việc | Hiển thị | Nguồn |
|---|---|---|
| **Import contact** | Trong dialog: tiến độ theo từng dòng (đang lưu, xong, lỗi). Không đóng được khi đang lưu; xong thì tóm tắt "Saved X, failed Y" + danh sách lỗi. Chạy lại bỏ qua dòng đã lưu. Đóng trình duyệt là dừng: nói rõ điều này khi đang chạy | PRD CON-SEQ-004; app thật `EmailContactsList.tsx` |
| **Xác minh domain** | Tự kiểm ở nền, kèm nút "Re-check"; trạng thái riêng từng DNS record; không chặn danh sách (AC-EC-D-03/04, AC-EC-DV-03). Xong hoặc lỗi thì báo qua chuông | PRD Email Campaigns; app thật `domain-recheck.ts` |
| **Gửi batch** | Xếp hàng xong chuyển sang báo cáo; báo cáo hiện số theo trạng thái (BAT-VIEW-001). Tự dừng thì báo qua chuông + email cho admin | PRD Email Campaigns, Master v1.4.8 |
| **Agent** | Danh sách bước chạy, mỗi bước có thời gian (AC-AG-S-02/03); sau 15 giây chưa phản hồi thì hiện cảnh báo (AC-AG-T-05) | PRD AI Agent |
| **Export** | Dialog chọn số dòng (có trần), tải xuống ngay, toast kết quả. Thứ tự dòng theo cách bảng đang sắp xếp (designer 2026-11-18) | App thật `CompaniesExportButton.tsx` |

- Không hứa "we'll notify you when done" cho import và export: PRD và app thật chưa có thông báo cho hai việc này.
- Việc chạy quá lâu hoặc hết giờ: nói cho người dùng biết, không để họ chờ mãi (PRD Master v1.4.8, EC-AG-28).

## 9.15 Chữ trên màn (chốt 2026-11-10)
Lỗi hay gặp: agent đọc PRD và code rồi đưa hết lên màn, làm màn rối và che mất thông tin chính. PRD và code là để hiểu **cách màn hoạt động**, không phải danh sách thứ cần hiện.

**Việc kỹ thuật cho người không kỹ thuật** (người dùng chốt 2026-11-12): một câu kết luận trên đầu ("Ready to send…"), mỗi mục gọi bằng việc nó làm cho người dùng ("Signs your emails") kèm tên kỹ thuật xám bên cạnh, chuỗi thô (bản ghi DNS, ID) ẩn sau "Show …" và mở sẵn chỉ khi mục đó đang lỗi; trạng thái là hành động ("Done", "Not found yet", "Works · Make it stronger"). Mẫu: Settings › Domain › Records.

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
- Mô tả dưới tiêu đề trang: tối đa **một dòng**, chỉ khi tiêu đề chưa đủ rõ; thường thì bỏ. Nói trang dùng để làm gì; không lặp lại tiêu đề, không kể lại các tab hay bước của stepper bên dưới (designer 2026-11-18; vd. Posts "Plan, publish and measure your social posts.").
- Mỗi dòng bảng tối đa hai tầng chữ (DESIGN.md mục 2); dòng phụ không lặp lại cột khác.
- Nhãn nút: động từ + đối tượng, 1–3 từ ("Export report", không "Click here to export your report").
- Màn trống: tiêu đề một dòng + một câu (mục 9.5).

**Ưu tiên trên một màn:** một câu hỏi chính của người dùng, tối đa ba thông tin chính trả lời câu hỏi đó ở phần trên màn; mọi thứ khác lùi xuống dưới hoặc vào chi tiết.

## 9.16 Quy ước lấy từ Studio Admin (chốt 2026-11-10)

Người dùng chốt lấy Studio Admin (`D:\Workspace\Saella\Studio Admin`, trang `src/app/(main)/dashboard/`) làm chuẩn cho bố cục, cách thể hiện element và mật độ (CLAUDE.md bước 4). Bảng dưới là các quy ước chung rút từ Studio Admin; màn có trang mẫu tương ứng thì theo trang mẫu. Màu, font, bo góc và logic số liệu vẫn theo Saella.

| Chủ đề | Quy ước |
|---|---|
| Đầu trang | Tiêu đề 24px nét 500 chữ thường (`DESIGN.md` mục 5); mô tả `text-sm` `muted-foreground` ngay dưới. Nút `size="sm"` (28px) bên phải: outline trước, nút cam cuối |
| Nhịp khoảng cách | Khối trên trang cách 16px, từ `md` 24px. Trong card và toolbar: 8–12px |
| Bảng | Cột chia bằng đường kẻ dọc mảnh (`border-r border-border/50`, cột cuối không kẻ). Ô lề 16px, hàng ~48px, tên cột 500 màu chữ chính không nền, rê chuột `muted/50`. Dòng hai tầng: tên `font-medium`, dòng phụ `text-sm muted-foreground` |
| Thao tác dòng | Nút icon ghost "⋯" ở cột cuối, menu `align="end"`; cột thao tác căn phải |
| Phân trang | 50 dòng mỗi trang, **không có "Rows per page"** (designer 2026-11-18: mọi bảng); chân bảng "1 – 50 of N" + nút trang; chỉ hiện khi dài hơn một trang. Chọn hết qua "Select all N matching" |
| Bảng trống | Một dòng "No results." căn giữa khi lọc không ra; chưa có dữ liệu thì theo mục 9.5 |
| Ô tìm | `InputGroup` có icon kính lúp, rộng ~256px |
| Form | Nhãn nằm trên trường; trường rộng hết khung, khung form tối đa ~512px (`max-w-lg`); hai trường ngắn đứng cạnh nhau `grid sm:grid-cols-2 gap-4` |
| Chân dialog, sheet | Nút căn phải: Cancel (outline) trước, nút chính sau |
| Biểu đồ | Luôn nằm trong Card có tiêu đề, điều khiển (chọn kỳ…) ở `CardAction`. Không vạch dọc, không vạch chia trục; chữ trục `text-xs` `muted-foreground`; tooltip dạng `indicator="line"` |
| Chọn kỳ | Một nút `outline size="sm"` ở góc phải ghi kỳ đang chọn, mở một popover: các kỳ có sẵn bên trái (bấm là áp dụng, đóng), "Custom range" lịch 2 tháng bên phải, Apply mới áp dụng; không chọn được ngày tương lai (như app thật; mẫu: `PeriodPicker` ở Overview) |
| Dropdown | `align="end"`, rộng 160–192px (`w-40`, `w-48`) |

## 9.17 Chờ tải (ĐX 2026-11-11)
Trang có dữ liệu nặng không được để màn trắng. App thật chỉ có `loading.tsx` ở các route Email, dùng skeleton chung của antd không khớp bố cục. Bản mới: khung trang hiện ngay, mỗi khối dữ liệu tự tải và báo tiến độ theo thời gian chờ. Demo: Overview và Leads › Self-upload, thêm `?slow=1` hoặc `?slow=fail` vào URL.

| Mốc | Hiển thị |
|---|---|
| **0s** (bấm link) | Thanh mảnh 2px màu `brand` chạy ở mép trên (`RouteProgress`); mục sidebar vừa bấm sáng ngay, không chờ route |
| **~0.3s** (route hiện) | `PageHeader`, tab, ô tìm, bộ lọc, nút hiện thật; vùng dữ liệu là skeleton đúng hình khối thật. Khối nào xong trước hiện trước |
| **1s** (chốt 2026-11-14) | Hộp trạng thái đè giữa skeleton: bước đang làm + thanh tiến độ + phần trăm, để người dùng biết phải chờ bao lâu (data thật tải lâu hơn bản demo). **Đếm được** (dòng về theo từng trang): % thật, "1,500 / 4,675 contacts · 32%". **Không đếm được** (số liệu tổng hợp, biểu đồ, AI viết): % ước tính theo thời gian thường mất, ghi "~" và "usually ~8s"; tới thời gian thường mất là ~90%, sau đó nhích dần tối đa 95% và đổi thành "taking longer than usual"; không bao giờ 100% khi dữ liệu chưa về |
| **15s** | Alert `warning` đè lên skeleton: "Still loading …" + **Retry**; yêu cầu vẫn chạy, dữ liệu về thì hiện luôn |
| **Lỗi** | Alert `destructive` thay chỗ khối đó + **Retry**. Khối đã tải giữ nguyên |
| **Quay lại trong phiên** | Hiện ngay bản trước, kèm "Updating… · Updated 2 min ago" ở thanh công cụ hoặc dòng đếm; không xoá trắng |

**Quy tắc.**
- Skeleton khớp bố cục thật để dữ liệu về không làm nhảy trang: cùng số ô KPI và cỡ ô (cả dòng ghi chú), biểu đồ là một khối cùng chiều cao, bảng có tên cột thật, đúng số cột, độ rộng cột và chiều cao hàng, khoảng 5–8 hàng (bảng top 5 thì 5).
- Mỗi khối dữ liệu một vùng tải riêng (`SectionLoader`), khoá theo bộ lọc nó phụ thuộc; khối nhanh không chờ khối chậm. Khung card (tiêu đề, mô tả) hiện thật, chỉ phần thân là skeleton.
- Bộ lọc cần dữ liệu mới có lựa chọn (vd. Tag) vẫn hiện tại chỗ, tạm `disabled`.
- Vùng đang tải có `aria-busy`; dòng trạng thái là `aria-live="polite"`. Thanh trên cùng `aria-hidden` (Next tự đọc tên trang mới).
- Giảm chuyển động: thanh trên cùng đứng yên đủ bề ngang, skeleton và spinner không nhấp nháy.
- Chữ: nói bước đang làm ("Calculating delivery and open rates…", "Ranking campaigns and templates…"), có số thì nêu số; không "Please wait". Lỗi theo mục 9.10.
- Dưới 1 giây không hiện gì ngoài skeleton (lần tải nhanh không bị nháy thanh).
- Chữ trạng thái chỉ nói bước đang làm; thời gian và % do `LoadingStatus` tự hiện, không viết "can take up to 20 seconds" vào chữ.
- Thời gian ước tính: production lấy từ các lần tải trước của khối đó; demo dùng độ trễ giả lập.

**Component.** `RouteProgress` (gắn một lần ở `app/layout.tsx`), `useSectionLoad` + `SectionLoader` (`section-loader.tsx`), `LoadingStatus`, `SectionStalled`, `SectionError`, `UpdatedIndicator` (`loading-status.tsx`), `Skeleton` của shadcn. Chế độ chậm giả lập: `lib/mock/delay.ts`.

## 9.18 Chi credit cho một hành động (ĐX 2026-11-12)

Theo app thật #116 (`useCompanyUnlock.tsx`, `api/companies/unlock` + `unlock/quote`) và PRD-05 (1 credit mỗi công ty, đã unlock thì không tính lại). Mẫu: Leads › Find companies (`components/features/unlock-dialog.tsx`, `unlocks.ts`).
- **Một đối tượng:** nút ghi giá ngay trên nhãn ("Unlock · 1 credit", icon khoá có tooltip "Unlock for 1 credit"), bấm là làm, không hỏi lại.
- **Nhiều đối tượng:** nút trên thanh chọn ghi tổng giá ("Unlock · 5 credits", là nút cam đặc của trang khi đang chọn); bấm → `AlertDialog` hỏi "Unlock N companies?", chỉ ghi Cost, không hiện số dư sau khi chi (người dùng chốt 2026-11-14), nút xác nhận `default` ghi lại giá. Mục đã có thì không tính, câu mô tả nói số được miễn; mục không unlock được (công ty không có email) thì câu mô tả nói số bị bỏ qua ("17 have no email and aren't unlocked").
- **Unlock ở chỗ cần dữ liệu** (designer 2026-11-16/17, thay "chỉ tiêu credit ở Leads" 2026-11-12): New batch › Recipients có công tắc Unlocked | Locked; Locked là công ty còn khoá khớp campaign (email che). Tick rồi "Unlock · $…" là mở ngay (cùng hộp xác nhận như Leads), hoặc để tới Send now: hộp hỏi cả bước "Unlock 3 and send to 20 companies?", nút "Unlock and send" (designer 2026-11-18). Chỉ phần unlock tính credit, gửi miễn phí (PRD-05); Save draft không unlock gì. Schedule unlock theo từng lượt chạy (`decisions.md`). Thiếu credit cho phần đã tick: dòng chặn ở chân bước kèm link "Top up credits" mở hộp Top up tại chỗ (designer 2026-11-18). Không công ty đã unlock nào khớp: màn trống với "Show locked matches" và "Use Self-upload".
- **Số dư một nguồn:** mọi chỗ hiện hoặc trừ credit đọc cùng một số dư (mock: `lib/mock/credits.ts`), nên ô credit ở sidebar giảm ngay sau khi tiêu.
- **Không đủ credit:** không làm phần nào (tất cả hoặc không). `AlertDialog` "Not enough credits": cần bao nhiêu, đang có bao nhiêu; nút "Top up credits" mở hộp Top up ngay tại chỗ (`components/features/top-up-dialog.tsx`: gói + số lượng, thanh toán qua Stripe), không đưa người dùng sang Billing rồi quay lại (designer 2026-11-17). Hộp Top up chọn sẵn gói nhỏ nhất đủ bù phần thiếu (prop `need`, mô tả "you need N more"; thiếu hơn gói lớn nhất thì tăng số lượng). Trả xong thì quay về đúng chỗ đang làm: Unlock (Leads, New batch) hiện lại hộp xác nhận "Unlock N companies?" với số dư mới, bấm một lần nữa là xong; Export (Leads › Unlocked) giữ hộp Export và số dòng đã nhập, nút Export bấm được ngay. Hủy Top up thì về lại "Not enough credits".
- **Ai mua được:** mọi thành viên đã đăng nhập (designer 2026-11-18, PRD-05 BILL-SEQ-003); đổi gói và Stripe portal chỉ admin.
- **Các lối mua credit khác:** "Top up credits" ở ô credit cuối sidebar mở cùng hộp Top up (không có `need`); schedule chờ credit có "Buy credits" trên thẻ (hộp Top up theo từng lượt, `runCosts`); thông báo chuông "A schedule is waiting for credits" mở thẻ Automation của template đó (`/templates/<id>#automation`), nơi có Buy credits. Settings › Billing vẫn là chỗ xem plan, gói và lịch sử credit; mua gói ở Billing cũng mở chính hộp Top up này (designer 2026-11-18, bỏ thanh kéo riêng). Giá trong hộp theo gói tháng đang dùng, cùng nguồn với Billing (`usePlanTier`, `lib/mock/pricing.ts`).
- **Sắp hết credit** (designer 2026-11-18): một quy tắc cho mọi chỗ cảnh báo: còn dưới 20% credit của kỳ (`creditStanding` / `useCreditStanding`, `lib/mock/credits.ts`). Ô credit ở sidebar chuyển đỏ, Billing hiện `Alert` "You're running low on credits" kèm credit tháng sau; không dùng ngưỡng số dư cố định.
- **Xong:** toast "N companies unlocked · X credits left"; dữ liệu hiện đầy đủ tại chỗ, đánh dấu đã mở (badge `success` "Unlocked" trong sheet).
- Không có gì để mua (đã mở hết, hoặc không có dữ liệu ẩn): nút khoá kèm tooltip lý do (mục 9.12).
- **Agent** (designer 2026-11-18; PRD-05 "Billable AI actions", PRD-03 AC-AG-W-01..03; app thật nhánh development `lib/credits/agent-actions.ts`, `agent-billing.ts`). Mẫu: `components/features/agent-chat/` (`data.ts` `BillableAction`, `agent-chat-provider.tsx`).
  - **Giá:** 1 credit mỗi hành động. Câu hỏi (trả lời, số liệu, tìm công ty), dashboard, lọc người nhận: một lần mỗi lượt; câu hỏi chỉ tính khi lượt không có hành động tính tiền nào khác. Viết nội dung template: mỗi template. Tạo campaign, template, schedule, follow-up: mỗi cái tạo ra (template tạo kèm nội dung = 2). Gửi: mỗi batch gửi đi (gửi 20 người trước rồi phần còn lại = 2 batch). File báo cáo người dùng yêu cầu: mỗi file. Miễn phí: chạy thử (dry run), lượt dừng chờ duyệt, điều hướng, ghi nhớ, xoá, kích hoạt template; một tool chạy nhiều lần cho cùng một việc vẫn là 1 credit.
  - **Trừ trước khi chạy**, qua `spendCredits` (ô credit sidebar và Billing › Usage dòng "Agent actions · …" cập nhật ngay). Lượt trừ cả hành động nó tự làm lẫn bước duyệt chạy không hỏi (Always allow); bước chờ duyệt trừ khi bấm Approve.
  - **Báo giá trước:** thẻ duyệt có bước tính tiền ghi "Costs 1 credit ($0.09)" cạnh nút (giá theo gói, `creditsUsd`); bước miễn phí không ghi. Duyệt xong dòng thu gọn ghi thêm "· 1 credit used".
  - **Sau mỗi lượt:** một dòng 12px `muted-foreground` ở **cuối lượt** (sau mọi phần của lượt: chữ, bảng, thẻ duyệt), đếm mọi bước trong lượt kể cả bước chạy sau thẻ duyệt tự động, "5 steps · 5.0s · 3 credits used" (designer 2026-11-18; không hiện token, mục 9.15); rê hoặc Tab vào số credit thì tooltip kể từng thứ ("Campaign, Template, Email draft: 1 credit each"). Lượt không tốn gì: "No credits used".
  - **Không đủ credit:** lượt (hoặc bước duyệt) không chạy gì; panel hiện dòng nền vàng "Not enough credits. This needs N credits, you have M. Nothing was done." + "Top up credits" mở hộp Top up tại chỗ (`need` = phần thiếu). Trả xong dòng đổi thành "Credits added…" + "Try again" (chạy lại lượt); bước duyệt thì bấm Approve lại trên thẻ.
  - **Hoàn credit:** lượt lỗi giữa chừng hoặc bị bấm Stop được hoàn đủ qua `addCredits` (`kind: "refund"`, "Agent prompt failed" / "Agent prompt stopped", Usage ghi Refunded). Lượt lỗi: "1 credit refunded." nằm trong Alert lỗi, bước hỏng chuyển đỏ, dòng cuối lượt chỉ còn số bước và thời gian (designer 2026-11-18); lượt bị Stop: dòng cuối lượt ghi "1 credit refunded". Thử: gõ "offline" trong panel; `?credits=0` khi tải trang để thử thiếu credit.
- **Billing:** ⓘ chi phí ghi "Agent action: 1 credit, refunded if it fails", khớp mục này.
