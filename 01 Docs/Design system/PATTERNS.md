# PATTERNS.md: Saella Platform

Cách giải từng loại bài toán giao diện: bảng, form, số liệu, phản hồi, quyền, chữ trên màn. Quy tắc nền (quy tắc đã chốt, token, màu, chữ, component) ở `DESIGN.md`: đọc mục 2 của file đó trước. Không cần đọc hết file này: bảng "Tra nhanh" đầu `DESIGN.md` chỉ mục cần đọc cho từng việc.

Các mục giữ số 9.x (trước là mục 9 của `DESIGN.md`); code và docs trích dẫn dạng `PATTERNS.md §9.7`. **Thêm mục mới thì đánh số tiếp (9.16…), không đánh số lại.**

## 9.1 Bảng dữ liệu + bộ lọc
**Dùng cho** Leads, Templates, Recipients, Settings. Quy tắc trình bày bảng: DESIGN.md mục 2 "Bảng".
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

## 9.2 Form nhiều bước
**Dùng cho** gửi batch, sending setup (domain, DNS, sender), onboarding.
- **Khung.** `Stepper` trên cùng; bước xong có tick `success`. Đáy: "Back" (`outline`, trái) và "Continue" (`default`, phải).
- **Mỗi bước một nhóm quyết định.** Kiểm lỗi khi rời trường, câu lỗi dưới trường. Quay lại bước trước không mất dữ liệu.
- **Bước cuối là Review.** Tóm tắt + kiểm tra trước khi gửi: dữ liệu người nhận thiếu thì chọn fallback hoặc loại ra; lỗi chặn nút gửi.
- **Bước kỹ thuật** (DNS record): `CopyButton` và trạng thái xác minh riêng từng record.

## 9.3 Trình soạn email
**Dùng cho** Templates editor, Write with AI.
- **Ba vùng.** Trái: khối, merge tag. Giữa: xem như người nhận. Phải: thuộc tính khối, kiểm nội dung.
- **Merge tag** hiện dạng chip, kể cả ngoài trình soạn (subject ở báo cáo batch và New batch, `SubjectText`). Tag lạ viền `destructive` và chặn "Mark active".
- **Kiểm subject** chấm ngay khi gõ, không chặn lưu. Chỉ liệt kê mục chưa đạt; mục đạt gộp thành "6 of 6 look good".
- **Write with AI.** Một lối vào duy nhất (tab ở panel phải). Kết quả vào vùng xem trước; người dùng chọn "Use" / "Try again", không ghi đè thẳng.
- **Màu email tách khỏi màu UI.** Màu template do người dùng chọn. Khung email luôn dùng bảng màu sáng `.email-canvas` (token `--email-*`, cố ý không có bản `.dark`), kể cả khi app ở dark: hiện đúng thứ người nhận thấy.

## 9.4 Agent đề xuất → người dùng duyệt
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

## 9.5 Màn trống
- **Cấu trúc.** Icon → tiêu đề một dòng → câu giải thích → một nút chính (+ link phụ). Không dùng nhân vật chibi.
- **Phân biệt bốn loại**, mỗi loại một nội dung: chưa có dữ liệu lần đầu / lọc không ra / không có quyền / lỗi tải.

## 9.6 Master–detail (dữ liệu cha–con)
**Dùng cho** Campaigns (campaign → template).
- **Bố cục.** Tab trạng thái có đếm, cùng hàng với tìm kiếm + lọc. Dưới là khung chia đôi: trái 280px danh sách cha (mục chọn nền `primary-subtle` + vạch `brand` bên trái), phải là chi tiết (đầu trang, `KpiStrip`, bảng con có hàng tiêu đề).
- **Trạng thái chọn** ghi vào URL (`?c=<id>`). Bộ lọc làm mất mục đang chọn thì tự chọn mục đầu.
- **Dòng con phụ thuộc** (follow-up) nằm ngay dưới dòng gốc, thụt vào có ↳; dòng phụ là điều kiện.
- **Mở rộng dòng** (`renderExpanded`) chỉ khi dòng con ít và không cần đủ cột.

## 9.7 Số liệu
Ngưỡng và màu: DESIGN.md mục 2 "Số liệu". Mục này quy định cách trình bày.

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

## 9.11 Form và kiểm lỗi

- **Khi nào kiểm.** Kiểm khi rời trường (như 9.2) và khi bấm lưu; lỗi hiện ngay dưới trường, viền `destructive`. Bấm lưu khi còn lỗi thì đưa focus về trường lỗi đầu tiên (**ĐX**; app thật kiểm khi gõ, mặc định của antd).
- **Giới hạn độ dài.** Trường ngắn (tên, tiêu đề) dùng giới hạn cứng. Trường dài (hướng dẫn agent, 4,000 ký tự, AC-AG-I-01) **không cắt ngầm**: hiện bộ đếm "n / 4,000", vượt thì báo lỗi và khoá nút lưu (app thật `AgentSettingsSection.tsx`).
- **Giới hạn số lượng** (số domain, sender, thành viên, dòng import, dung lượng file): nói trước khi người dùng chạm tới, vd. "Up to 1,000 rows, 5 MB" ngay ở ô chọn file. Khi đã đầy, nút thêm khoá kèm tooltip nói lý do (app thật: nút Add domain).
- **Trùng lặp.** Contact trùng email + công ty thì **cập nhật** bản cũ, không tạo bản mới (PRD AC-CON-M-02, AC-CON-I-04); giao diện nói rõ điều này ở bước xem trước import và khi lưu.
- **Import.** Luôn có bước xem trước trước khi ghi (AC-CON-I-02); dòng lỗi hoặc bị bỏ qua được liệt kê kèm lý do.
- **Lưu lỗi.** Giữ nguyên dữ liệu đã nhập và ở lại bước hiện tại (PRD Onboarding AC-ONB-W-04).

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
- Hết credit: PRD chưa định giao diện (xem "Chưa chốt").

## 9.13 Định dạng, cắt chữ, ngôn ngữ

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
- Cột tên chính không bị bóp khi thêm cột; dòng phụ trong bảng cắt trước, tên cắt sau.
- URL dài cắt ở giữa, giữ tên miền và phần cuối (**ĐX**).

## 9.14 Việc chạy lâu

| Việc | Hiển thị | Nguồn |
|---|---|---|
| **Import contact** | Trong dialog: tiến độ theo từng dòng (đang lưu, xong, lỗi). Không đóng được khi đang lưu; xong thì tóm tắt "Saved X, failed Y" + danh sách lỗi. Chạy lại bỏ qua dòng đã lưu. Đóng trình duyệt là dừng: nói rõ điều này khi đang chạy | PRD CON-SEQ-004; app thật `EmailContactsList.tsx` |
| **Xác minh domain** | Tự kiểm ở nền, kèm nút "Re-check"; trạng thái riêng từng DNS record; không chặn danh sách (AC-EC-D-03/04, AC-EC-DV-03). Xong hoặc lỗi thì báo qua chuông | PRD Email Campaigns; app thật `domain-recheck.ts` |
| **Gửi batch** | Xếp hàng xong chuyển sang báo cáo; báo cáo hiện số theo trạng thái (BAT-VIEW-001). Tự dừng thì báo qua chuông + email cho admin | PRD Email Campaigns, Master v1.4.8 |
| **Agent** | Danh sách bước chạy, mỗi bước có thời gian (AC-AG-S-02/03); sau 15 giây chưa phản hồi thì hiện cảnh báo (AC-AG-T-05) | PRD AI Agent |
| **Export** | Dialog chọn số dòng (có trần), tải xuống ngay, toast kết quả | App thật `CompaniesExportButton.tsx` |

- Không hứa "we'll notify you when done" cho import và export: PRD và app thật chưa có thông báo cho hai việc này.
- Việc chạy quá lâu hoặc hết giờ: nói cho người dùng biết, không để họ chờ mãi (PRD Master v1.4.8, EC-AG-28).

## 9.15 Chữ trên màn (chốt 2026-11-10)
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
- Mỗi dòng bảng tối đa hai tầng chữ (DESIGN.md mục 2); dòng phụ không lặp lại cột khác.
- Nhãn nút: động từ + đối tượng, 1–3 từ ("Export report", không "Click here to export your report").
- Màn trống: tiêu đề một dòng + một câu (mục 9.5).

**Ưu tiên trên một màn:** một câu hỏi chính của người dùng, tối đa ba thông tin chính trả lời câu hỏi đó ở phần trên màn; mọi thứ khác lùi xuống dưới hoặc vào chi tiết.
