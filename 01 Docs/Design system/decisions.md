# Quyết định

Chỉ ghi **thay đổi lớn so với app hiện tại** (Repo: Next 14 + antd 5) và việc đang chờ duyệt. Quy tắc thiết kế đang áp dụng nằm ở `DESIGN.md` và `PATTERNS.md`; chi tiết màn hình tra PRD. **ĐX** = đề xuất, khác cả repo lẫn PRD.

## Chưa chốt

Chưa có hiệu lực: agent không áp các việc dưới đây như quy tắc. Chốt xong thì chuyển quy tắc sang `DESIGN.md` (hoặc `PATTERNS.md` nếu là pattern) và xoá dòng ở đây.

### Bạn quyết (thiết kế)
- **Campaigns: phương án 1 hay 2.** 1 = danh sách trái, chi tiết phải (`/campaigns`). 2 = mỗi campaign một thẻ thu gọn được (`/campaigns-2`, thêm `?state=many` để xem 60 campaign). Chọn xong xoá phương án còn lại và mục "Campaign 2" trên sidebar.
- **Saella mini: chọn 1 trong 6 kiểu** (Visor, Hood, Helmet, Orb, Blob, Classic; so ở `03 Brand/saella-mini-*.png`, app đang dùng Visor). Dùng làm avatar agent là đổi quy tắc cũ của LP ("không làm avatar AI"), cần báo người giữ brand LP.
- **Sidebar & lối vào agent** (canvas Design, page Sidebar, 2026-11-04): giữ kiểu nhóm hiện tại, không hiện số đếm trên mục nav. Chưa chốt: chuyển "Ask the agent" vào cuối sidebar thay nút nổi (đổi quyết định cũ), và có cần ô đổi workspace không (tra PRD).
- **Overview: chọn option 4** (canvas, page Overview, 2026-11-05): một trang, bỏ 3 tab Campaign / Template / Sender của app hiện tại; KPI tính trên toàn workspace (tổng, không lấy trung bình tỉ lệ từng dòng); chia nhỏ theo Campaign / Template / Sender nằm trong một khối Breakdown; sender lỗi hiện thành việc trong Needs you.
- **Credits** (canvas, 2026-11-05): bỏ khỏi header, đặt ở cuối sidebar: "820 left · Starter plan · +600 on Nov 12", không thanh (credits = gói + gói mua thêm, không có mức trần). Theo PRD billing, tự gửi email miễn phí; agent tốn 1/yêu cầu và 1/batch nó gửi; mở khoá liên hệ 1; tính phí đang tắt. Chưa chốt: có cảnh báo sắp hết credits không, ngưỡng bao nhiêu.
- **Ngưỡng Bounce lệch 5% / 7%:** số Bounce tô cảnh báo từ 5% (`RATE_BANDS`), nhưng nhãn "Near limit" ở Sending health bật từ 70% ngưỡng tự dừng = 7%. Chọn một mức cho cả hai.
- **Nhân vật chibi ở dark mode:** nét đổi thành màu chữ, thân màu nền (nét ink gốc biến mất trên nền tối).
- **PATTERNS.md 9.9–9.14: các dòng đánh dấu ĐX** (2026-11-10): không mở dialog chồng dialog; bấm lưu khi còn lỗi thì focus về trường lỗi đầu tiên; URL dài cắt ở giữa. PRD và app thật không nói.

### Hỏi team dev / product owner
- **Agent chặn chờ duyệt 2 hay 5 bước.** Repo chặn 2 (activate template, gửi thật), PRD-03 chặn 5. Đang theo repo; xem kiểu PRD bằng `/agent?gates=all`.
- **Ngưỡng cần team xác nhận:** Open, Click, Reply, Unsub chưa có ngưỡng ở app thật lẫn PRD nên đang không tô màu; nếu muốn đánh dấu thì team cần đặt ngưỡng. Spam tự dừng 0,3%; gửi thử khi từ 100 người nhận (gửi trước 20).
- **PRODUCT.md: mục 4–5 cần product owner duyệt** (2026-11-09): ba từ tính cách "tidy, trustworthy, hardworking", bối cảnh dùng và danh sách "không được giống" là suy từ PRD và brand LP, PRD không ghi.
- **PRD chưa định, cần team trả lời** (2026-11-10): giao diện khi hết credit (API trả 402, chưa có màn); có đánh dấu `*` cho trường bắt buộc không; có thông báo khi import / export xong không.
- **PRD tự mâu thuẫn, cần team chốt** (2026-11-10): số người nhận tối đa mỗi batch (Master 2,000; Email Campaigns 5,000; agent 500); file import quá 1,000 dòng bị từ chối (AC-CON-I-03) hay cắt lấy 1,000 dòng đầu (CON-SEQ-004); báo cáo trống hiện "0" kèm giải thích (EC-EC-31) hay "–" (Master v1.6.8, đang theo cách này).

### Cần kiểm
- **Geist và dấu tiếng Việt** (2026-11-10): giao diện có tiếng Việt (PRD Language), nhưng `layout.tsx` chỉ nạp bộ chữ `latin` của Geist. Cần dựng thử một màn tiếng Việt: dấu hiện đúng bằng Geist thì giữ; lỗi hoặc lệch font thì nạp thêm bộ chữ hoặc đổi sang Inter (đổi font là đổi brand, cần chốt).

## Thay đổi lớn so với app hiện tại

Những chỗ bản mới **cố ý khác** app thật (Repo). Đọc Repo gặp các chỗ này thì giữ bản mới, không sửa về như Repo. Mỗi dòng: Repo → bản mới; cách làm chi tiết ở mục được trỏ tới.

### Nền tảng
- antd 5 → shadcn/ui + Tailwind 4, chỉ dùng token Saella, style kế thừa LP (DESIGN.md mục 1, 3–4).
- Thêm dark mode: mặc định light, đổi Light / Dark / System ở menu tài khoản (DESIGN.md 4.4).
- Nhiều kiểu hiện giờ → mọi giờ theo múi giờ workspace, mặc định GMT+7, một bộ format chung (PATTERNS 9.8, 9.13).
- Lên lịch chỉ hiện tên múi giờ → cho chọn múi giờ, mặc định theo nước đích của campaign; không gửi theo giờ từng người nhận (PATTERNS 9.8).
- Ô chọn ngày giờ → `DatePicker`, `DateRangePicker`, `TimePicker` (DESIGN.md mục 2 "Control").

### Khung app
- Sidebar thu gọn thành dải icon, nhóm có nhãn: Overview · Outreach (Campaign, Template) · Audience (Leads) · Workspace (Settings).
- Contacts và Companies tách riêng → một mục **Leads**, 2 tab Find companies / Contacts; giữ đường dẫn `/companies`, `/contacts`.
- Header thêm ô tìm nhanh Ctrl/⌘K (trang + hành động) và chuông thông báo.
- Agent mở thành panel bên phải kéo rộng 320–900px từ nút nổi "Ask the agent"; gương mặt agent là Saella mini.

### Số liệu
- Biểu đồ tròn cho tỉ lệ → chỉ con số, mỗi tỉ lệ một cột; chỉ Bounce và Delivery có ngưỡng (DESIGN.md mục 2 "Số liệu", PATTERNS 9.7).
- Đoạn chú thích cách tính cuối trang → bỏ; thông tin phụ vào ⓘ (DESIGN.md mục 2 "Nội dung").

### Màn hình
- **Overview:** dải KPI 6 ô (Delivery, Open, Click, Reply, Bounce, Unsubscribe), không so kỳ trước. Biểu đồ "Email performance" chuyển Rates / Counts, chọn chỉ số; ngày không gửi bỏ điểm (Repo vẽ về 0). Recent batches chỉ batch đã gửi. Recent replies lọc theo ý định. Breakdown 3 tab Campaigns / Templates / Senders, mỗi tab top 3 + "View all"; Senders là bảng sức khoẻ địa chỉ gửi, không xếp hạng. Thẻ "Get started" 4 bước cho workspace mới. Bảng xếp hạng mặc định "All metrics", chọn chỉ số thì xếp như Repo (**ĐX**).
- **Overview › Needs a reply:** reply vẫn về hộp thư người gửi như Repo; thêm "Mark as answered" để tự gạch khỏi danh sách (**ĐX**).
- **Campaigns:** Repo bấm campaign là nhảy sang Metrics → có khung chi tiết campaign với số tổng. Tab trạng thái có đếm. Follow-up là dòng con dưới template gốc, kèm điều kiện gửi. Trạng thái theo PRD: campaign Not started / Active / Ended / Archived; template Active / Inactive; batch Draft…Failed.
- **Gửi batch:** wizard nhiều bước. "Send to" + "Don't send to"; "Who is left out" theo lý do. Kiểm dữ liệu người nhận theo merge tag thực dùng, chọn fallback hoặc loại ra. Xem trước thư theo từng người nhận. Batch chỉ gửi ngay; gửi theo giờ là việc của Automate › Schedule (như Repo). Batch do agent chuẩn bị chờ duyệt, duyệt xong gửi ngay. "Coming up" trên Overview = các lần chạy sắp tới của Schedule.
- **Báo cáo batch:** ô số liệu bấm được, mở danh sách người nhận đã lọc. Dropdown lọc → chip có đếm. Chip Replied + phân loại ý định trả lời.
- **Templates:** trình soạn dạng khối (**ĐX**: chưa kéo thả, chưa A/B). Write with AI viết cả Subject (3 phương án). Subject check khi gõ. Content check chặn Mark active (**ĐX**). Automate giữ per-run cap và target total theo PRD dù Repo đã bỏ (**ĐX**).
- **Leads › Contacts:** nhóm contact bằng **tag** như Repo, không có danh sách có tên. Repo lọc 1 tag → lọc nhiều tag cùng lúc (**ĐX**). Hồ sơ mở dạng Sheet, có lịch sử template đã gửi. Import có bước review, chọn cách xử lý trùng, màn kết quả New / Updated / Skipped / Errors. Email status như Repo: Valid / Invalid kèm lý do.
- **Leads › Find companies:** mọi bộ lọc thành chip + Clear all. Chip Total / New / Already saved. Trạng thái công ty (Inactive, Ceased, Unknown) là cột riêng, chỉ hiện khi không hoạt động. Saved search có tên. Khi chưa lọc, mở bằng ô mô tả gửi sang agent.
- **Agent:** trang toàn màn có danh sách thread (đổi tên / xoá là **ĐX**) + panel Campaign flow. Approval queue gom việc chờ duyệt của mọi thread. Gửi thật từ 100 người thì gửi thử 20 trước. Nút Stop khi agent đang trả lời.
- **Settings:** Sending health đầu trang (Delivered / Bounce / Spam kèm "pauses at …", không thanh; Resume sending). Sender mặc định chỉ đặt ở Sending › Senders; Organization không còn chọn Default. Organization: mời thành viên ngay trên bảng, hiện số seat.
- **Login:** khoá tài khoản (join pending, workspace locked, account disabled) là trạng thái của `/login`, không tách route (**ĐX**).
- **Onboarding:** có nhân vật chibi (chỉ dùng ở đây); một nút chính duy nhất (Get started → Draft my setup khi có website); chọn ngôn ngữ chỉ ở header.
