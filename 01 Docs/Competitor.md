# Competitor

Mục đích: hiểu đối thủ, học design pattern và chức năng của họ để áp dụng vào Saella. Mỗi đối thủ một mục. Ghi rõ cái gì **nên học**, cái gì **không hợp** với Saella.

Cách đọc mỗi mục: Flow (luồng nhiều bước) → Màn hình lẻ → Danh mục pattern → Áp dụng cho Saella.

| Đối thủ | Nền tảng | Ngày phân tích | Nguồn |
|---|---|---|---|
| Mục | Đối thủ | Ngày phân tích | Nguồn (Mobbin, bản web) |
|---|---|---|---|
| 1 | Mailchimp | 2026-10-28 | Ảnh chụp 7/2024 |
| 2 | Apollo.io | 2026-10-29 | 2 đợt: 2/2025 và 2–3/2026 |
| 3 | Clay: phần gửi email (thay Instantly) | 2026-10-29 | Chụp 3/2026; chỉ 2 flow |
| 4 | HubSpot | 2026-10-29 | Chụp 8/2025 |
| 5 | Unify (thay Lemlist) | 2026-10-29 | Chụp 8/2026 |
| 6 | Clay: AI agent (thay Artisan) | 2026-10-29 | 3 đợt: 11/2023, 1/2025, 3–4/2026 |
| 7 | Hunter.io | 2026-10-29 | **Mobbin không có**, mục để trống |
| 8 | Buffer | 2026-10-29 | 2 đợt: 8/2025 và 6/2026 |

Mục 3–8 do subagent quét Mobbin rồi viết theo khuôn mục 2; mỗi mục ghi rõ đã tìm gì và Mobbin thiếu gì.

### Danh sách đối thủ theo tầng (chốt 2026-10-29)

Mỗi sản phẩm chỉ nằm ở một tầng, là tầng gần với chức năng chính của nó nhất. Mobbin không có Instantly, Lemlist, Artisan (cả 11x, Relevance AI, Regie.ai, AiSDR) và Hunter.io, nên dùng app thay thế cùng nhóm.

| Tầng | Nhóm | Dự kiến | Đã phân tích | Lý do chọn |
|---|---|---|---|---|
| 1 | Đối thủ trực tiếp: tìm lead + outreach | Apollo.io, Hunter.io | Apollo.io | Giống Saella nhất; PRD gọi tên Apollo |
| 2 | Chuyên cold email | Instantly, Lemlist | Clay (gửi email), Unify | Chuỗi follow-up, hạ tầng gửi, duyệt nháp |
| 3 | Email marketing + CRM | Mailchimp, HubSpot | Mailchimp, HubSpot | Trình soạn, báo cáo, hồ sơ contact có dòng thời gian |
| 4 | Mạng xã hội hợp nhất | Buffer | Buffer | Module social của Saella |
| 5 | AI agent làm sales | Artisan | Clay (Sculptor/Claygent) | Trải nghiệm agent, luồng duyệt |

### Đề xuất áp dụng vào Saella (ĐX 2026-10-29, chờ duyệt)

Duyệt theo mã. Mọi thay đổi chỉ làm trên bản thiết kế (mock); cột "Backend" cho biết app thật có cần team dev thêm dữ liệu/API không. Ưu tiên: **P1** đáng làm ngay, P2 nên làm, P3 làm sau.

| Mã | Màn | Thay đổi | Học từ | Hiện trạng Saella | Backend | Ưu tiên |
|---|---|---|---|---|---|---|
| R1 | Gửi batch › Recipients | Thêm "Không gửi cho" (loại trừ list/tag) và dòng "Ước tính N / M người nhận", bấm xem lý do bị loại (unreachable, đã huỷ đăng ký, trùng giữa các list) | HubSpot, Mailchimp F1 | Chỉ chọn list, chưa loại trừ | Cần (loại trừ, đếm trùng) | **P1** |
| R2 | Gửi batch › Review | Kiểm tra theo từng người nhận trước khi gửi: "12 người thiếu First name → lời chào sẽ rỗng", xem danh sách, chọn cách xử lý | Clay mục 3 (bài học ngược), HubSpot | Review tóm tắt batch, chưa soi dữ liệu từng người | Cần | **P1** |
| R3 | Gửi batch › Review | Xem trước email với dữ liệu thật: chọn một người nhận để xem đúng thư họ sẽ nhận | Clay mục 3, Mailchimp F3 | Chưa có | Không (mock); thật cần render | P2 |
| R4 | Template › Write with AI | Viết subject: đưa 3 phương án để chọn, mỗi cái có 👍/👎; nội dung vẫn "Use this draft / Try again" | Apollo A4, Mailchimp F1 | 1 bản nháp mỗi lần | Có thể dùng sẵn generator | P2 |
| R5 | Template › editor | Checklist subject chấm trực tiếp khi gõ (độ dài, emoji, chữ in hoa) ngay cạnh ô subject | Mailchimp F1 | Content check chạy khi Mark active | Không | P3 |
| R6 | Báo cáo batch › Recipients | Thêm chip "Replied" và phân loại phản hồi (Muốn gặp, Hỏi thêm, Vắng mặt, Không quan tâm…) | Apollo A5, Unify | Chip đã có (2026-10-29), chưa có Replied | Cần (phân loại reply) | P2 |
| R7 | Báo cáo batch › Overview | Ô số liệu có dấu hiệu bấm được (mũi tên cạnh ghi chú) | Mailchimp F8 | Ô bấm được nhưng chỉ đổi nền khi rê chuột | Không | P3 |
| R8 | Contacts › hồ sơ contact | Dòng thời gian hoạt động: đã nhận batch nào, mở/click/trả lời lúc nào, nhóm theo tháng | HubSpot, Apollo A2 | Dialog contact chưa có lịch sử | Cần (dữ liệu có sẵn theo người nhận, thiếu API) | **P1** |
| R9 | Contacts › import | Bước kiểm tra: "0 lỗi trong 1.240 dòng", xử lý trùng (bỏ qua / cập nhật), trang kết quả Mới / Cập nhật / Lỗi | HubSpot, Apollo A7, Mailchimp F6 | Có map cột, xử lý trùng chưa rõ | Một phần | P2 |
| R10 | Contacts | Thay cờ "unreachable" bằng 3 mức: An toàn / Cẩn thận / Không gửi | Apollo A1 | Có cờ unreachable | Cần (trạng thái xác minh) | P3 |
| R11 | Companies › bộ lọc | Bộ lọc đang bật có chấm báo + chip giá trị + nút xoá nhanh; đầu kết quả có Tổng / Mới / Đã có trong list | Apollo A1 | Có lọc ngành/vùng, lưu list | Phần "Mới / Đã có" cần | **P1** |
| R12 | Companies | Lưu bộ lọc thành "tìm kiếm đã lưu" để mở lại hoặc giao cho agent | Apollo A1 (A-P3) | Lưu được list, không lưu bộ lọc | Cần | P2 |
| R13 | Companies › trạng thái trống | Ô "Mô tả khách hàng bạn cần tìm" gửi thẳng cho agent + vài chip lọc nhanh | Apollo A1 (A-P5), Clay | Chưa có | Không (dùng agent sẵn có) | P2 |
| R14 | Overview | Thẻ "Bắt đầu" cho workspace mới: domain → sender → list → batch đầu, có tiến độ x/4 | Mailchimp F5, Apollo A5 | Có trạng thái trống | Không (suy ra từ dữ liệu sẵn có) | P2 |
| R15 | Overview | Khối "Phản hồi gần đây": ai vừa trả lời, batch nào, mở nhanh | Apollo A5 | Chưa có | Cần | P3 |
| R16 | Settings › Sending | Thẻ sức khoẻ gửi: Delivered %, Bounce %, Spam % so với ngưỡng tự dừng (10% / 0,3%), kèm gợi ý xử lý | Apollo A8 | Có domain, sender; ngưỡng chỉ hiện ở báo cáo | Không (số đã có) | P2 |
| R17 | Agent | Hàng đợi duyệt: agent tạo nháp, danh sách bên trái, nội dung bên phải, duyệt từng cái hoặc "Duyệt N cái đã sẵn sàng" | Unify, Clay mục 6 | Có panel 5 bước + Approve trong chat | Tuỳ quyết định 2 hay 5 bước | **P1, chờ chốt ĐX agent** |
| R18 | Agent | Trước khi agent gửi batch lớn: "Gửi thử 20 người trước" hoặc "Gửi hết", kèm số lượng | Clay mục 6 | Chưa có | Cần | P3 |

### Điểm chung đáng học nhất (tổng hợp từ 8 mục)

Chi tiết và mã pattern ở từng mục. Đây là những ý lặp lại ở nhiều đối thủ, nên ưu tiên trước.

| Chủ đề | Học từ | Áp vào Saella |
|---|---|---|
| Tạo campaign dạng checklist, nút gửi mờ tới khi đủ, lỗi nằm ngay trong mục + nút sửa | Mailchimp F1, Clay mục 3, HubSpot | Campaign / gửi batch |
| Màn duyệt trước khi gửi: tóm tắt chỉ đọc (người nhận ước tính, giờ gửi + múi giờ), báo biến lỗi/dữ liệu thiếu theo từng người | HubSpot, Clay mục 3 (bài học ngược), Unify | Campaign; luồng duyệt của agent |
| Agent để **nháp chờ duyệt**, hàng đợi duyệt, chạy thử N dòng trước khi chạy hết, nút Stop | Unify, Clay mục 6, Apollo A-P14 | Agent (câu hỏi duyệt 2 bước hay 5 bước) |
| Bảng người nhận: dải đếm trạng thái bấm để lọc, cột bước hiện tại / version, phân loại phản hồi theo ý định | Apollo A-P10/A-P17, Unify, Mailchimp F8 | Bảng recipients của template |
| Màn tìm lead: panel lọc có chấm báo + chip, Total / Net New / Saved, lưu bộ lọc thành persona | Apollo A1 | Companies |
| Hồ sơ contact có dòng thời gian hoạt động + AI tóm tắt | HubSpot, Apollo A2 | Contacts |
| Import: map cột có đếm lỗi, quy tắc trùng lặp, trang kết quả New / Updated / Errors | HubSpot, Apollo A7, Mailchimp F6 | Contacts › import |
| Cài domain / mailbox theo từng bước, giải thích "vì sao" | Apollo A8, Mailchimp F9 | Settings › Sending |
| AI đưa nhiều phương án để chọn, có 👍/👎, người dùng tự chèn | Apollo A4, Buffer, Mailchimp F1 | Template + Write with AI |

---

## 1. Mailchimp (web)

### 1.0 Nguồn và giới hạn

- Toàn bộ ảnh lấy từ Mobbin, app "Mailchimp" bản web. Ngày trong ảnh là 7/2024 (tài khoản dùng thử, gói Free rồi Standard), nên **giao diện hiện tại của Mailchimp có thể đã khác**.
- Đã quét 15 nhóm chủ đề. Từ lượt tìm thứ 12 trở đi, kết quả lặp lại các flow đã thấy, nên đây gần như là toàn bộ những gì Mobbin có về Mailchimp web.
- Mobbin **không có**: màn A/B test, hồ sơ chi tiết một contact (timeline hoạt động), inbox hội thoại, campaign calendar mở ra, trang template đã lưu. Mấy phần này cần tự đăng ký tài khoản để xem nếu muốn.
- Mailchimp là email marketing cho B2C/thương mại điện tử (khách đăng ký nhận tin). Saella là outreach B2B tới lead tìm được. Pattern UI học được nhiều, còn mô hình dữ liệu (audience, subscription status) thì không chép thẳng.

### 1.1 Khung app (IA)

```
┌──────────────────────────────────────────────────────────────┐
│ logo │      [ Search Mailchimp ]       │ Live expert help │ S │  ← top bar
├──────────┬───────────────────────────────────────────────────┤
│ [Create] │  Tiêu đề trang (serif)          [phụ]  [Chính]    │
│ Campaigns▾│  ───────────────────────────────────────────────  │
│ Automat.▾ │  nội dung                                         │
│ Audience▾ │                                                   │
│ Analytics▾│                                                   │
│ Website ▾ │                                                   │
│ Content ▾ │                                                   │
│ Integr. ▾ │                                                   │
│┌────────┐│                                                   │
││87 ngày ││                                         [Feedback]│ ← tab dọc mép phải
││Upgrade ││                                               (?) │ ← help nổi
│└────────┘│                                                   │
│     [⇤]  │                                                   │
└──────────┴───────────────────────────────────────────────────┘
```

- **Sidebar**: nút `Create` viền to ở trên cùng (tạo mọi thứ từ một chỗ), nhóm menu thu gọn được (accordion), mục con thụt vào; badge `New` cạnh mục mới (SMS, Brand Kit). Cuối sidebar: thẻ trial/upgrade ("87 days left…", nút `Schedule a call` / `Upgrade`) và nút thu gọn sidebar.
- **Top bar**: ô search toàn cục ở giữa, nút `Live expert help` (chấm xanh = đang online), avatar.
- **Account menu** (bấm avatar): tên + badge vai trò `Owner`, Notifications, Profile, Account & billing, Pricing plans, ngôn ngữ, Log out, thẻ "Your dedicated team" có nút đặt lịch gọi.
- **Màn tập trung** (soạn email, import, journey, form): bỏ sidebar, chỉ còn thanh trên có nút back, tên + badge `Draft`, các bước dạng breadcrumb, nút `Exit` / `Finish later`.
- Các trang Audience/Account có thêm **thanh tab ngang thứ hai** (Overview · Manage audience ▾ · Add contacts ▾ · Settings ▾), lặp lại với sidebar.

### 1.2 Flow

#### F1. Tạo và gửi email campaign: "checklist một trang"
[Creating an email](https://mobbin.com/flows/23d57674-555e-4c47-9981-b50bca0dc76c) (12 màn) · [Adding a subject](https://mobbin.com/flows/7914a31c-22ff-4cb5-bae8-b8ef005422e3) · [Adding a send time](https://mobbin.com/flows/d1aef7db-12de-4182-841f-bd155121b5a4) · [Scheduling an email](https://mobbin.com/flows/010cb836-cebc-4a49-a70f-81f51f9e60d5)

Bố cục: cột trái là checklist 5 mục **To · From · Subject · Send time · Content**, cột phải là preview email (khung xám khi chưa có nội dung). Mỗi mục là một hàng có icon tick (xám = chưa xong, đen = xong), tóm tắt giá trị, và nút viền `Add …` / `Edit …`. Bấm vào thì mục đó **mở rộng tại chỗ** thành form có `Save` / `Cancel`, không chuyển trang.

- **Tiêu đề trên thanh trên đổi theo tiến độ**: "Keep it up!" → "You're almost finished!" → "Your email is ready to send!". Nút chính chuyển từ `Send` (disabled) → `Send` → `Schedule` khi đã chọn giờ.
- **To**: chọn audience, dropdown "Send to" gồm All subscribers / `+ Target contacts` / Pasted emails / nhóm TAGS / nhóm PRE-BUILT SEGMENTS. Có ô **"Do not send to (optional)"** để loại trừ segment/tag. Checkbox "Personalize the 'To' field" + chọn merge tag `*|FNAME|*`. Tóm tắt hiện "Customer in the audience X. **3 recipients** ↗" (số người nhận là link).
- **From**: tên + email. Dòng cảnh báo "To ensure delivery, we'll change your from address to …@mailchimpapp.com" (khi dùng email miễn phí, chưa xác thực domain).
- **Subject**: ô subject + preview text, có nút emoji trong ô. Link `Recent performance`. Khung **"Generate subject line and preview text options"** (AI, chọn mục đích email + "Tell AI how to edit" → `Generate`), kèm dòng "AI may produce inaccurate content…" và 👍/👎. Bên phải có **checklist best practice chấm trực tiếp** khi gõ: "Keep it short and sweet" (cảnh báo cam), "Emojis are great… in small quantities", "Space is limited", "That's impressive" (tick xanh).
- **Send time**: 2 thẻ radio lớn `Schedule a time` / `Send now`. Chọn ngày, rồi `Send Time Optimization` (AI chọn giờ, cần đặt trước 48h) hoặc `Send at a specific time` + múi giờ có link `Edit`. **Batch delivery**: "Send in [2] batches of subscribers [5 minutes] apart". Checkbox **"Finalize your recipients at send time"**.
- **Content**: nút `Design email` → chọn template → trình soạn (F3). Sau khi xong: "Didn't get your test email?", "A plain-text version… included automatically. Edit".
- Bên dưới checklist: "Share Your Email" (link công khai của email).
- **Màn thành công**: "Nice job! Your email is scheduled." + minh hoạ, thẻ tóm tắt (To/From/Subject/Send time), nút `Replicate email`, link `View email in browser`, `← Back to All campaigns`, preview email bên phải.

Biến thể (postcard): mục lỗi trong checklist có **icon X đỏ + giải thích + nguyên nhân thường gặp + nút `Resolve`** ("We couldn't find any mailing addresses for this audience. Here are a few common causes: …"). Cột phải: "Estimated delivery within 5–9 business days" + thẻ thanh toán.

#### F2. Danh sách campaign
[Campaigns](https://mobbin.com/flows/448ac1a5-ea17-4abd-a942-5fcb7ab325c1)

- Tiêu đề "All campaigns", nút `View analytics` (viền) + `Create` (đặc). Tab `List` / `Calendar`.
- Thanh lọc: ô search, `Type: All ▾`, `Status: All ▾`, `Folder: All ▾`, `Clear`, bên phải `Sort: Last edited ▾`.
- Bảng: checkbox · Name (link, dưới là icon loại + "Regular email / Customer Journey / Survey / Landing page" + "Last edited [ngày] by [người]") · Status (badge: Draft xám, Scheduled xanh dương, Published/Active xanh lá, kèm ngày) · Audience (+ "Tags: Customer") · Analytics (số theo loại: Opens/Clicks, Started/In progress/Completed, Responses) · Actions.
- **Nút hành động đổi theo trạng thái**, dạng split button (nút + mũi tên menu): Draft → `Edit`; Scheduled → `Pause and edit`; Sent → `View report`; Journey chưa xong → `Finish setup`; Survey → `View results`.
- Đổi tên: modal "Rename email" có helper "Internal use only. Ex: 'Monthly newsletter'". Sau thao tác hiện toast đen ở đáy.
- Phân trang: "Showing results 1–18 of 18", `Page [1] of 1`, nút đầu/trước/sau/cuối.

#### F3. Trình soạn email (drag-and-drop)
[Adding a paragraph](https://mobbin.com/flows/aba872c5-d8d4-4a91-9f36-846f87bb709c) · [Preview email](https://mobbin.com/flows/7d508481-6d7b-40a6-bcad-c2c1516b0b64) · [Sending a test email](https://mobbin.com/flows/190ffe09-df1f-4669-9305-8a05985d08e5)

- Thanh trên: tên email · nút `Help me design my email` (AI) · "Changes saved" (tự lưu) · undo/redo · `Preview` · `Send test` (viền) · `Save and exit ▾` (split).
- Rail trái 3 icon: **Add** (khối), **Styles** (style toàn email), **Optimize** (kiểm tra). Panel Add có tab `Content` / `Layouts`; lưới khối có icon: Heading, Paragraph, Button, Divider, Spacer, Image, Logo, Creative Assistant, Video, Social, Survey, Code, Apps, Product, Product Rec, Review Product.
- Chọn một khối: panel trái chuyển thành cài đặt khối, có `< Done`, tab `Content` / `Design` / `Visibility`; nhóm LAYOUT, BLOCK (màu nền, padding có "Apply to all sides"). Trên canvas: khối được viền, **toolbar nổi bên phải khối** (di chuyển / nhân bản / xoá đỏ).
- Sửa chữ: toolbar định dạng phía trên canvas (kiểu đoạn, font, cỡ, màu, B/I/U/S, link, căn lề, list, xoá định dạng). AI viết lại đoạn: popover "Generating content…" ngay dưới đoạn đang chọn, có dòng miễn trừ AI.
- Styles: tab `Desktop` / `Mobile`, accordion Email / Text (P, H1–H4: font, cỡ, màu, B/I/U, căn, line-height, letter-spacing, hướng chữ) / Link / Button / Divider.
- **Optimize**: "Help improve your click rates with these tips"; nhóm **Errors** (Links 0, Merge Tags 0) và **Optimizations** Beta (Heading Length, Sentence Length), mỗi nhóm bật/tắt được.
- **Preview**: modal toàn màn, tab `Desktop` / `Mobile` / `Inbox`; panel phải "Email Info" (To, From, Subject, Preview text) + toggle **"Enable live merge tag info"**.
- **Send test**: modal nhập nhiều email (phân cách dấu phẩy), mục mở rộng "Include instructions and a personal message (optional)", khung lưu ý về địa chỉ From miễn phí. Thành công: banner xanh "Bon voyage, test email!" + khung vàng lưu ý về spam + `Send another test email` / `OK`.

#### F4. Chọn template và Creative Assistant
[Selecting a template](https://mobbin.com/flows/e140b1b4-e15f-404d-b238-8344a1e244a0) · [Selecting a style](https://mobbin.com/flows/e8fbc6eb-f538-4785-86d2-65a4fe6ac6e9) · [Content](https://mobbin.com/flows/4a8b66ae-6b79-43ac-8190-442db7eb3588)

- "Select a template": modal toàn màn, 3 dropdown lọc `Email Purpose` / `Industry` / `Style`, `Clear all`, đếm "137 templates", toggle "Free templates only". Lưới thẻ có ảnh preview dọc + tên ("Performance invite", "Post-purchase welcome"…).
- Creative Assistant (AI tạo hình theo brand): màn giới thiệu chia đôi (video bên trái, form bên phải "Your Website URL" → `Import My Brand`, hoặc `Try Sample Brand` / `Upload My Logo`). Sau đó tab `Create Designs` / `Design Library` / `Brand Kit`; stepper ngang Goal → Text → Imagery; "Or start from a past design". Lưới kết quả: hover hiện `Edit Design` / `Select Style` + toggle `Animate`; chọn kênh/kích thước (Email: Full width, Half width, 4:1, 1:1…; Landing page; Facebook) → `Download Selected` / `Save To Design Library`.

#### F5. Onboarding và Home
[Onboarding](https://mobbin.com/flows/72bac006-1f37-4f9d-b70b-e07a1df8c877) (26 màn)

- Màn chia đôi: trái là câu hỏi, phải là **preview sản phẩm thay đổi theo câu trả lời** (email mẫu, brand kit). Thanh tiến độ mảnh ở đáy + `< Back`.
- Câu hỏi dạng thẻ chọn nhiều ("How do you sell to your customers?": Our own website / Physical location / Online marketplaces / Consultation process / Social media), có lối thoát "We're not currently selling".
- **Import your brand**: nhập URL website để lấy logo, màu, font, ảnh; luôn có `Skip`.
- Thanh toán: form trái, thẻ "Purchase summary" phải (gói, giảm giá, thuế, tổng, `Pay now`), dòng trấn an "Cancel anytime · No annual contract".
- **Home sau onboarding**: "Welcome, Sam Lee! Let's dive into your personalized setup guide." 3 track bên trái (Set up the basics ~28 phút / Engage your audience / Automate your funnel); bên phải accordion việc cần làm kèm ước lượng thời gian ("About 15 mins"), badge "Recommended for you", **vòng tiến độ 0/3**.

#### F6. Audience: import, bảng contact, tag, segment
[Importing contacts](https://mobbin.com/flows/428fd60d-ce34-48c1-bde8-f357c6a58c26) (16 màn) · [Audience](https://mobbin.com/flows/50d44b31-44a4-4ccc-a164-b77b160de6b5) · [Tags](https://mobbin.com/flows/2ada5498-9636-4aa1-8300-d7c268144bb8) · [Adding filters](https://mobbin.com/flows/ae9e1e68-8506-4081-980d-73b08f4023c2)

- **Import**: màn tập trung, breadcrumb bước trên thanh trên: Choose Method › Upload › Organize › Tag › Match › Subscribe › Complete › Confirmation, nút `Exit`.
  - Upload: 2 ô lớn `Browse` / `Drag and drop a file`; nút phụ `Help me format my CSV` (mở chatbot trợ giúp với mẹo định dạng) và `Watch a tutorial`. Sau khi chọn: thẻ file (tên, dung lượng, X).
  - **Match**: bảng xem trước dữ liệu, mỗi cột có header sửa được; cột **không nhận diện được tô màu đỏ/cam + icon !**, cột hợp lệ có checkbox. Dòng tóm tắt "1 column will be imported. 2 columns will not be imported." + `Help me match column labels`.
  - Subscribe: chọn trạng thái marketing (bắt buộc) + giải thích về quyền gửi.
- **Bảng contacts**: đầu trang là tên audience + badge "SMS-enabled" + "4 total contacts. 4 email subscribers…" (số là link), link `See audience analytics →`. Thanh `Filter by tags ▾` / `View segments ▾` / `Create new segment ▾`; trên bảng: `Columns`, `Export audience`. Cột: Email, First name, Source ("List Import from CSV", "Admin Add"), **Rating (1–5 sao chấm mức tương tác)**, ngày thêm, ngày đổi.
- **Tags**: trống thì có minh hoạ + "You don't have any tags yet". Có dữ liệu: danh sách chip tag + ngày tạo + split `View ▾`; sort; `Delete` (disabled tới khi chọn); `Create Tag` / `Bulk Tag Contacts`.
- **Segment builder**: modal toàn màn "Regular segment builder", "Filter contacts for [audience]", mỗi điều kiện là **một hàng gồm 3 chip dropdown** (`Tags` · `contact is not tagged` · `Loyal`) + X + menu ⋮; `+ Add filter`; `Use segment`.
- **Audience dashboard** khi trống: hero "Grow Your Mailchimp Audience" + `Add Your Contacts`, thẻ "Talk to a specialist", các thẻ học (101, webinar), "No contacts? No problem." với hàng hành động (Create a signup form / Create a social post).

#### F7. Automation: Customer Journey
[Creating a customer journey](https://mobbin.com/flows/c2870795-6eef-4bab-8088-00e480452c95)

- Trang tổng: hero + `Build from scratch` / `Choose pre-built journey`; lưới thẻ journey dựng sẵn (Welcome new contacts, Email tagged customers, Celebrate birthdays, Recover abandoned carts…) có badge `Popular` và icon tích hợp cần dùng. Dòng báo gói: "You are on the Free Plan. Enjoy a preview…, then upgrade to launch them."
- **Builder**: canvas dọc. Node bắt đầu "Contact signs up to [audience]" + chip **"Filtered by: Conditions 2"**; ô viền đứt "Add starting point 2" bên cạnh; nút `+` tròn giữa các node để chèn bước; node gửi email có **thumbnail email** + "Send email Welcome email"; kết thúc "Contact exits". Zoom +/−/fit góc phải dưới. Panel trái: "Contact repeats journey", Edit Settings. Thanh trên: tên + `Draft`, `Send Test Emails`, `Turn On`.
- Bật xong: màn "Hooray! Your contacts are on their way!" + `Continue` / `View Journey`.

#### F8. Báo cáo và Analytics
[Overview](https://mobbin.com/flows/ffb7a26c-3639-4154-8a08-d427e30b3118) · [Report detail](https://mobbin.com/flows/f5ac53db-dd7b-415b-8dbe-24ad1de29d6b)

- **Danh sách Reports**: cột trái lọc "View by Status" (All/Ongoing/Completed) và "View by Type" (Emails, SMS, Automations, Landing pages…), folder; danh sách bên phải có số Opens/Clicks ngay trên hàng, `View Report ▾`, `Download All Reports`.
- **Báo cáo một campaign**: tên to, `Switch report ▾`; tab Overview / Click Performance / Recipient Activity ▾ / E-commerce ▾ / Content Optimizer / Social / Analytics360.
  - Overview: "3 Recipients", audience, subject, ngày gửi, link View email · Download · Print · Share. **4 ô số lớn** Opened / Clicked / Bounced / Unsubscribed (số là link sang danh sách người). Dưới là 2 cột dạng key–value: Successful deliveries, Total opens, Last opened, Forwarded, Inbox replies · Clicks per unique opens, Total clicks, Last clicked, Abuse reports.
  - **Campaign benchmarking**: so với "Your average" và "Your peers' average" theo ngành (biểu đồ cột, tab Open/Click/Unsubscribes), có lời khen "Well, this is exciting. You're doing great!".
  - Click Performance: bảng link với Total clicks / Unique clicks (số + %), nút `View Click Map`.
  - Top locations by opens: danh sách quốc gia + bản đồ.
  - **Content Optimizer**: điểm "10 out of 10 best practices met", thanh tiến độ theo nhóm (Text & Visuals, Links & CTAs, Typography) và checklist cụ thể (câu < 25 từ, ≥ 1 CTA, body ≥ 14px…).
- **Marketing dashboard**: 3 bộ lọc `Date range` / `Comparison` (Previous 30 days, Audience averages) / `Filter by message name`; checkbox "Exclude Apple MPP for more accurate open data" (lọc mở thư do Apple tự tải). Popover chọn ngày: preset + Start/End date + `Cancel` / `Apply`. Thẻ "Monitor performance" (tên sửa được ✎) với KPI tách theo kênh (email/SMS) và so sánh kỳ trước; "Performance over time" với chọn metric + `Day / Week / Month`. Thẻ giới thiệu tính năng mới nổi góc phải ("New · Filter Apple MPP… · Got it").
- **Audience analytics**: Summary (Total / Subscribed / Non-subscribed / Unsubscribed, tách Email only/SMS only/Both), Contacts breakdown theo khoảng ngày.

#### F9. Tài khoản, billing, domain
[Account & billing](https://mobbin.com/flows/3fbe128b-0bd8-4e51-9699-054c3b96332a) · [Contact information](https://mobbin.com/flows/54f0e7fd-04ee-45ee-a5a9-3d0f927d0b58) · [Verifying a domain](https://mobbin.com/flows/469fc953-8fb2-4325-9c29-3b92296199bd)

- Tab ngang: Overview · Settings ▾ (Details, Users, Security, Contact information, Manage my data, Manage my plan) · Billing ▾ (Monthly plans, Billing information, Billing history) · Domains · Extras ▾ · Integrations · Shop New Plans.
- **Overview**: tên gói + **thanh hạn mức** "Contacts 1 of 500", "Sends 0 of 6,000" + "499 contacts remaining" + link; thẻ xám "Next estimated bill: $15.00 · Autopay on…"; mục "Account issues" trống: "Everything's running smoothly!".
- Profile: ảnh đại diện (Upload / Take a photo), form thông tin; đổi mật khẩu có **quy tắc mật khẩu tick dần** và link "Generate strong password".
- Thông tin liên hệ/billing: dạng key–value chỉ đọc + nút `Edit …`; ghi chú lý do ("We'll show your audience's contact info in campaign footers to comply with international spam laws").
- **Domains**: `Add & Verify Domain` → modal nhập email trên domain đó → gửi mail xác minh. Danh sách "Custom Email Domains" với badge **"Needs authentication"** + split `Start Authentication ▾`; nhóm "Public Email Domains" (gmail…) giải thích vì sao không cần xác minh. Toast "Domain successfully verified!" + `Verify another`.

#### F10. Các flow phụ (ít liên quan Saella)
- Signup form: [Signup forms](https://mobbin.com/flows/be0bdb87-99b8-4875-b8c3-605a341358a6), [Creating a pop-up form](https://mobbin.com/flows/6ffcbd7e-70a1-481c-86e1-7daa5b91759d). Lưới thẻ loại form (Pop-up, Embedded, Signup landing page, Contact form…); builder pop-up có preview trong khung trình duyệt, tab trạng thái (Mobile banner / Email signup / Success).
- Survey: builder 4 bước (Questions › Design › Settings › Sharing options), panel thuộc tính câu hỏi nổi cạnh câu hỏi (loại, giá trị, Required, Auto-tagging, Duplicate/Delete); trang Survey Overview với toggle thông báo.
- Integrations: trang "Discover", search + lọc category bằng checkbox, thẻ app có badge "Made by Mailchimp" và số lượt cài.

### 1.3 Màn hình lẻ đáng chú ý
- [Global search](https://mobbin.com/screens/3312d5f2-da95-48fe-be65-99da5dbd4ede): overlay từ top bar, **chip phạm vi** Contacts / Campaigns / Features / Help articles, "Results: 3", kết quả có tiêu đề + mô tả, cuối có "Not the results you expected? Leave feedback 👍👎". Search tìm cả **tính năng** và bài trợ giúp, không chỉ dữ liệu.
- [Upload + chatbot trợ giúp](https://mobbin.com/screens/fbd1072d-f46f-4ad1-ad58-771162e225fa): bấm "Help me format my CSV" mở chat nổi góc phải với mẹo **đúng ngữ cảnh bước đang làm** + chip trả lời nhanh.
- [Audience analytics](https://mobbin.com/screens/ffed2075-00d3-48ba-81b8-79d821ba82b3).
- [Postcard có lỗi trong checklist](https://mobbin.com/screens/f29427af-f13a-479b-925d-ccca3a8389ac).

### 1.4 Danh mục pattern

| # | Pattern | Mailchimp dùng ở | Đánh giá cho Saella |
|---|---|---|---|
| P1 | Checklist một trang + preview bên phải, mục mở rộng tại chỗ | Tạo campaign | **Nên học**. Hợp màn tạo batch gửi |
| P2 | Tiêu đề/nút chính đổi theo tiến độ | Tạo campaign | Học phần nút (Send → Schedule); câu cổ vũ thì tuỳ giọng brand |
| P3 | Lỗi nằm ngay trong mục checklist: nguyên nhân + nút Resolve | Postcard | **Nên học**. Dùng cho domain chưa xác thực, merge tag hỏng |
| P4 | Live checklist best practice khi gõ subject | Subject | **Nên học**. Khớp "content check" trong PRD |
| P5 | AI sinh gợi ý tại chỗ + miễn trừ + 👍/👎 | Subject, đoạn văn | **Nên học**. Agent của Saella cũng nên có feedback từng lần |
| P6 | Split button hành động đổi theo trạng thái | Danh sách campaign, tag, domain | **Nên học** |
| P7 | Hàng danh sách 2 dòng: tên link + (loại · sửa lúc · bởi ai) | Campaign, form, report | Nên học |
| P8 | Số liệu inline ngay trên hàng danh sách | Campaign, report | Nên học |
| P9 | Màn tập trung bỏ sidebar, breadcrumb bước, Exit/Finish later | Import, editor, journey | **Nên học**. Cho import contact, soạn template |
| P10 | Bảng map cột: cột lỗi tô màu + dòng tóm tắt bao nhiêu cột được nhập | Import | **Nên học** |
| P11 | Segment builder: hàng điều kiện 3 chip | Segment, journey | Nên học. Dùng cho bộ lọc công ty (ngành/vùng) |
| P12 | Canvas journey dọc, `+` giữa node, chip điều kiện trên node | Customer journey | Tham khảo cho follow-up flow |
| P13 | 4 ô KPI lớn, số là link xuống danh sách người | Report | **Nên học** |
| P14 | So sánh với trung bình của mình + của ngành | Report | Tham khảo. Cần dữ liệu đủ lớn |
| P15 | Thanh hạn mức (x of y) + "còn lại" | Account | **Nên học**. Hạn mức gửi, credit |
| P16 | Setup guide: track, vòng tiến độ, ước lượng thời gian | Home | **Nên học** cho Overview lúc mới dùng |
| P17 | Onboarding chia đôi: câu hỏi trái, preview phải đổi theo câu trả lời | Onboarding | Nên học |
| P18 | Lấy brand từ URL website | Onboarding, Creative Assistant | Ý tưởng chức năng: agent đọc website để viết template đúng giọng |
| P19 | Search toàn cục có chip phạm vi, tìm cả tính năng + help | Top bar | Nên học |
| P20 | Trợ giúp đúng ngữ cảnh ("Help me format my CSV", "Help me match column labels") | Import | **Nên học**. Nút gọi agent kèm ngữ cảnh bước đang làm |
| P21 | Preview Desktop/Mobile/Inbox + toggle merge tag thật | Editor | **Nên học** |
| P22 | Send test: nhiều email, trạng thái thành công + cảnh báo spam | Editor | Nên học |
| P23 | Toast tối ở đáy kèm hành động tiếp ("Verify another") | Nhiều nơi | Nên học |
| P24 | Empty state: minh hoạ + 1 câu + hành động | Tags, Account issues | Học cấu trúc; Saella dùng icon thay minh hoạ (đã chốt) |
| P25 | Thẻ "New" nổi giới thiệu tính năng | Dashboard | Dùng tiết chế |
| P26 | Thẻ trial/upgrade cuối sidebar | Sidebar | Tham khảo khi có gói trả phí |

### 1.5 Chức năng đáng cân nhắc cho Saella

Chỉ ghi ý tưởng; muốn làm phải đối chiếu PRD và hỏi team, không tự thêm vào mock như thể app thật đã có.

1. **"Do not send to"**: loại trừ tag/segment khi chọn người nhận.
2. **Batch delivery chia đợt cách nhau N phút** và **"Finalize recipients at send time"**. Saella đã có batch; hai tuỳ chọn này nói rõ điều đang diễn ra cho người dùng.
3. **Send Time Optimization**: gợi ý giờ gửi.
4. **Rating 1–5 sao theo mức tương tác** trên bảng contact.
5. **Benchmark theo ngành**: hợp với dữ liệu ngành đã chuẩn hoá của Saella.
6. **Content Optimizer có điểm** sau khi gửi; trước khi gửi thì dùng nhóm Errors/Optimizations.
7. **Click map / bảng link** với total và unique clicks.
8. **Replicate email** ngay trên màn thành công.
9. **Bỏ lượt mở do Apple MPP**: PRD ghi Saella lọc bot khi đếm open, có thể hiện rõ như Mailchimp.
10. **Import brand từ URL** để agent viết template đúng giọng.

### 1.6 Không nên học

- Font serif to cho tiêu đề và minh hoạ vẽ tay: đó là brand Mailchimp, Saella dùng Geist + token riêng.
- Điều hướng trùng lặp: tab ngang thứ hai lặp sidebar ở Audience/Account, khó biết đang ở đâu.
- Quá nhiều nút viền to cùng cấp trên một màn (checklist có 5 nút `Edit …` ngang nhau). Saella nên để nút ghost/nhỏ hơn và chỉ một nút chính.
- Mô hình "audience + subscription status" dành cho danh sách người đăng ký. Contact của Saella đến từ tìm kiếm và upload. Bước "Subscribe contacts to marketing" không bê sang được; cần tra PRD module Contacts xem Saella xử lý quyền gửi thế nào.
- Upsell lồng khắp nơi (thẻ upgrade, "preview then upgrade", "Schedule a call" ở nhiều chỗ).

### 1.7 Gợi ý áp vào màn Saella hiện có

| Màn Saella | Lấy từ Mailchimp |
|---|---|
| Campaign / gửi batch | P1, P2, P3, P4, P6, P13; ý tưởng 1, 2, 8 |
| Template + Write with AI | P5, P9, P21, P22; lưới khối + panel thuộc tính; Optimize (Errors/Optimizations) |
| Contacts | P7, P10 (import), P11, P20; cột Source; rating tương tác |
| Companies | P11 (bộ lọc dạng chip điều kiện) |
| Overview | P16 (khi mới dùng), bộ lọc Date range + Comparison, KPI theo kỳ trước |
| Settings | P15, domain có badge trạng thái + split button, quy tắc mật khẩu tick dần |
| Onboarding | P17, P18 |
| Agent | P5 (👍/👎), P20 (gọi agent theo ngữ cảnh) |
| Khung app | P19, nút Create ở đầu sidebar, toast P23 |

---

## 2. Apollo.io (web)

### 2.0 Nguồn và giới hạn

- Ảnh từ Mobbin, app "Apollo" bản web, gồm 2 đợt chụp: **2/2025** (logo chữ A, sidebar có icon từng mục) và **2–3/2026** (logo hoa văn, có mục Assistant, Deliverability suite). Khi hai đợt khác nhau, ghi theo bản 2026.
- Đã quét 10 nhóm chủ đề: tìm người/công ty, hồ sơ người/công ty, sequence, soạn email, onboarding, AI assistant, import/list, deliverability, analytics, workflow.
- Mobbin **có** gần đủ những gì Saella cần tham khảo. **Chưa thấy**: màn Tasks và Calls mở ra, danh sách Emails đã gửi, bảng recipients của một sequence (chỉ thấy tab Contacts của sequence).
- Apollo bán cho đội sales (gọi điện, họp, deal, CRM). Phần Calls / Meetings / Conversations (ghi âm cuộc họp) / Deals không có trong PRD Saella, chỉ ghi ngắn để biết.

### 2.1 Khung app (IA)

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ ✳  « (thu)   │ [ Search across Apollo…   ⌘K ]   [✳ Execute with AI] AS│
│ Home      📞 ├──────────────────────────────────────────────────────┤
│ Assistant New│  Tiêu đề trang                   [phụ]   [Chính vàng] │
│ Prospect & enrich ▴                                                 │
│   People / Companies / Lists / Data enrichment                      │
│ Engage ▴     │                                                      │
│   Sequences / Emails / Calls / Tasks                                │
│ Win deals ▴  │                                                      │
│   Meetings / Conversations / Deals                                  │
│ Tools & automation ▴                                                │
│   Workflows / Analytics                                             │
│ Inbound ▴    │                                                      │
│ Saved records│                                                      │
│ [ Upgrade ]  │                                                      │
│ Onboarding hub 17% ▬▬──                                             │
│ Deliverability suite                                                │
│ Admin Settings                                                 (?)  │
└──────────────┴──────────────────────────────────────────────────────┘
```

- **Sidebar nhóm theo việc của người bán**: Prospect & enrich → Engage → Win deals → Tools & automation. Tên nhóm là động từ, đọc từ trên xuống là đúng thứ tự công việc.
- **Top bar**: ô search toàn cục có phím tắt `⌘K`, nút đen **"Execute with AI"** luôn hiện ở góc phải (gọi AI từ mọi màn), avatar.
- **Cuối sidebar**: nút `Upgrade` vàng, thẻ **"Onboarding hub"** có thanh tiến độ % (đóng được), `Deliverability suite`, `Admin Settings`.
- Account menu: Your profile, Activity & notifications, Theme ▸, Language (Beta) ▸, **View credit usage**, Upgrade plan, Chrome extension, Log out.
- Màu: nền trắng/xám rất nhạt, chữ đen, **một màu nhấn vàng chanh** chỉ cho nút chính (Create, Launch, Save, Access email). Tím chỉ dùng cho nút AI. Nhìn là biết nút nào quan trọng nhất.

### 2.2 Flow

#### A1. Tìm người (People search): màn quan trọng nhất
[Searching people](https://mobbin.com/flows/7f27802a-4798-4ca7-9067-38fcfd96cdde) · [Filtering contacts](https://mobbin.com/flows/5b34d2b6-03af-4fd1-859d-ffd1ca687270) (12 màn) · [Searching prospects](https://mobbin.com/flows/00a479f4-19bd-4964-9649-599a17bd21ac)

Bố cục 3 phần: panel lọc bên trái · bảng kết quả bên phải · thanh công cụ phía trên.

- **Thanh công cụ**: `Default view ▾` (chọn view đã lưu) · `Hide Filters [2]` (ẩn panel, kèm số bộ lọc đang bật) · ô tìm theo tên · `Research with AI ▾` · `Create workflow ▾` · `Save as new search` · `Sort ▾` / `Relevance ▾` · `Search settings`. Góc phải trên: `Import ▾`.
- **3 ô đếm đầu panel lọc**: `Total 748` · `Net New 748` · `Saved 0`, bấm để chuyển. "Net New" là người chưa có trong dữ liệu của mình: tách rõ lead mới và lead đã lưu.
- **Panel lọc**: danh sách accordion (Lists, Persona, Email Status, Job Titles, Company, Location, # Employees, Industry & Keywords, Market Segments, SIC & NAICS, AI Filters `New!`, Buying Intent, Scores, Technologies…). Mục **có bộ lọc đang bật thì có chấm xanh bên trái + chip `× 1`** để xoá nhanh; bên dưới tên mục hiện luôn giá trị đã chọn dạng chip ("Include titles: product designer ×"). Mục cần trả phí có icon khoá. Đáy panel: `Clear all [2]` · `More Filters`.
- **Bộ lọc Job Titles mở ra**: tab `Simple` / `Advanced`; ô Include (gợi ý dùng "dấu ngoặc kép" để khớp chính xác), checkbox "Include people with similar titles", ô Exclude, link "Past job titles", thêm Management Level, Departments; nút **`Save As New Persona`**.
- **Bộ lọc Email Status** chia 3 nhóm theo mức an toàn: *Safe to send* (Verified) · *Send with caution* (Unverified) · *Do not send* (Update required, Unavailable), mỗi nhóm một màu badge. Mục Advanced: toggle "Include catch-all emails".
- **Bảng kết quả**: checkbox · Name (link gạch chân) · Job title · Company (có logo) · Emails (nút **`Access email`** viền xanh: email ẩn tới khi bấm, tốn credit) · cột `+ Add column` ở cuối. Phân trang `1–30 of 748`.
- **Trống trước khi tìm**: "Use Apollo AI to find the right prospects" + ô nhập câu tự nhiên ("Find Account Executives in Chicago") + khung **Quick filters** dạng chip (Locations, Job titles, Email status, Industry), cuối có dòng "Unlock advanced filters" kèm nút `View plans`.
- **Không có kết quả**: minh hoạ kính lúp + "Try adjusting your search or filters…" + `Reset filters`.
- Banner upsell trên đầu bảng ("Need more pipeline? Upgrade…" kèm 3 tính năng có tick).

#### A2. Hồ sơ người và công ty
[People detail](https://mobbin.com/flows/f0db89d0-edce-4f7b-affe-b8f3fe410188) (10 màn) · [Company detail](https://mobbin.com/flows/0b72323c-3511-4340-9a8e-eb83bdf0bae3)

- **Xem nhanh dạng panel** khi bấm tên trong bảng: panel lớn đè lên bảng, đầu panel là tên + chức danh + công ty + vị trí, nút `Add to list` / **`Access email`** (vàng) / mở toàn trang ⤢ / đóng ✕. Không phải rời danh sách.
- Cột trái **Contact information**: email ẩn (`****@****.com` + `Access email`), mobile ẩn + `Access mobile` (ghi "credits"), số công ty; khung cảnh báo cam "Do Not Call (DNC) is not enabled".
- Cột phải **Company insights**: tab Score · Overview · News · Technologies (81) · Funding · Job postings · Employee trends · More ▾. News có tag loại tin ("Partners With", "Signs New Client"). Employee trends là biểu đồ cột chồng theo phòng ban + % tăng trưởng 6 tháng / 1 năm / 2 năm.
- Phần dưới: thông tin công ty dạng key–value (số nhân viên, công ty con, **SIC codes, NAICS codes**, stage, labels); **"Similar people"** (Beta, Apollo AI) là bảng người tương tự có sẵn `Access email`.
- **Trang người đầy đủ**: tab Contact overview · Sequences · Deals · Conversations · Meetings · Enrichment (New) · Custom fields; nút `Add to list` / `Send email` / **`Add to sequence`** (vàng). Thẻ Contact information có Contact Stage, Owner, **Engagement "0 Inbound · 0 Outbound"**, **"Last 12 months" dạng sparkline cột**, Lists, **Local time** của người đó. Thẻ Work history.
- **Trang công ty**: header có logo, link web/LinkedIn/Facebook/X, ngành · địa điểm · số nhân viên · doanh thu; tab Overview · Recommendations · Existing contacts · Employees · Sequences · Meetings · Enrichment · Deals · Conversations · Locations · Custom fields. Thẻ **"New prospects"** (Beta): người trong công ty nên tiếp cận, cột **Reason** giải thích vì sao gợi ý (`Persona Match`, `Seniority`, `Tenured`). Tab Deals là bảng kanban theo stage, cột có tổng giá trị.

#### A3. Sequence (chuỗi follow-up nhiều bước)
[Creating a sequence](https://mobbin.com/flows/39fd47be-b365-4767-a8e4-aee402046ccd) (11 màn) · [Creating an email](https://mobbin.com/flows/b2f619bd-3b66-4d2d-899e-b066401b90bf)

- **Tạo mới**: modal "New Sequence": tên + **Schedule** (chọn "Normal Business Hours", hiện ngay giờ gửi từng ngày Thứ 2–6, 8AM–5PM) + `Show advanced settings`.
- **Sequence trống**: minh hoạ chuỗi "Day 1 · Manual email → Day 3 · Automatic email → Day 5 · Phone call" + `Add a step`.
- **Thêm bước**: modal "Select a sequence step" (loại bước: Automatic email có nhãn `AI available!`, manual email, call, LinkedIn…), **"When to start this step"**: ngay khi thêm vào sequence, hoặc sau [1] [hours]. Advanced: "Limit number of emails sent from this step per 24 hours".
- **Trang sequence**: breadcrumb "Sequences › tên" + ☆; tab **Overview · Contacts · Emails · Tasks · Activity · Report · Settings**; nút `More ▾` · `Workflows ▾` · `Add Contacts ▾` (vàng) · `Launch` (hoặc toggle Active/Inactive).
  - Overview: dải **STATISTICS** (Active, Paused, Finished, Bounced, Not sent) và **EMAIL STATS PER INDIVIDUAL CONTACT** (Scheduled, Delivered, Reply, Interested, Opt out). Mỗi bước là một thẻ: số thứ tự · "Day 1: Automatic email" · số liệu riêng của bước · toggle bật/tắt · preview subject + đoạn đầu nội dung (merge tag `{{contact.first_name}}`) · nút `Add A/B Test` · menu ⋯ · tay kéo ≡. Bước manual có badge ưu tiên `medium` + "Schedule email task if no reply in 3 days". Cuối: `Add a step`.
  - **Contacts**: dải đếm theo trạng thái (Total · Cold · Approaching · Replied · Interested · Not interested · Unresponsive · Do not contact · Bad data · Changed job), bấm để lọc; thanh thao tác hàng loạt bằng icon (dừng, tạm dừng, tiếp tục, chuyển bước…); mỗi hàng: tên · badge trạng thái (`Paused` / `Finished`) · `Step` · badge giai đoạn (`Unresponsive`, `Interested`, `Cold`) · chức danh @ công ty · nút nhanh email/gọi/LinkedIn.
  - **Settings**: form Name, Folder, Tags, Owner, Schedule, **Sequence Ruleset** (quy tắc dùng chung): tạo task gọi khi người nhận mở email ≥ N lần; đánh dấu finished khi click link; đánh dấu unresponsive sau N ngày không trả lời; không gửi khi contact ở stage Bad Data / Do Not Contact / Replied / Interested.

#### A4. Soạn email một lần + viết bằng AI
[Sending an email](https://mobbin.com/flows/62ce66a4-133d-4cca-bc32-4ec1f0c044dd) · [Sending an email](https://mobbin.com/flows/cadcfab5-356e-473a-ad67-500595bb508f)

- **Composer dạng panel trượt bên phải** (hoặc cửa sổ nổi thu nhỏ được ở góc), không rời trang đang xem: From ▾ · To · "Add CC & BCC" · `Use template ▾` · `Send me a test email` · tab `Edit` / `Preview` · Subject · thân email · toolbar định dạng (có nút chèn biến `{ }`).
- Dưới thân email: 3 nút AI **`Write with AI`** · **`Rephrase`** · **`Analyze`**. Đáy: `Save as new template` · `Schedule` · **`Send Now`** (vàng). Gửi xong: toast "Success · Email sent" góc phải trên.
- **Write with AI** mở panel bên cạnh composer: "Personalized email", **nhiều phương án subject (radio + 👍/👎)**, phương án body, `Personalization settings`, `Generate ▾`. Người dùng chọn rồi mới đưa vào email.
- Từ trang Conversations (ghi âm cuộc họp) có nút **`Auto-draft email`**: AI soạn sẵn email tóm tắt cuộc họp.

#### A5. Onboarding và Home
[Onboarding](https://mobbin.com/flows/155b769c-7b71-4cd6-bc71-f9e45bf5c741) (17 màn) · [Starting an onboarding](https://mobbin.com/flows/4f5ea903-049d-4869-b7cf-e1fbd850d58a) (11 màn)

- Đăng ký: Google / Microsoft / email; màn "Please verify your email address". Sau đăng nhập, nếu domain đã có team: **"Exciting news: we found your teammates!"** + `Join` / `Start a new team`.
- Câu hỏi vai trò dạng radio-card (Founder, Sales Manager, SDR/BDR, Marketer…), có ô "Don't see your role?", `Skip`. Bên phải là hình minh hoạ đổi theo lựa chọn.
- **"Workspace set up"** toàn màn: thanh tiến độ 4 đoạn có tên (Essentials · Outbound · Inbound · Enrichment).
  - "Choose filters to focus your search": mỗi hàng một loại lọc (Job title, Location, Industry, Email status) với **chip gợi ý sẵn** + `+`; bên phải **đếm trực tiếp "240.0M people match your criteria"**, đổi ngay khi bấm chip.
  - "Add steps to your outreach workflow": chọn kênh (Send an email / Connect on LinkedIn / Set up a phone call, hoặc "I just want to find leads"); bên phải hiện **thẻ lead mẫu thật** (tên, vị trí, chức danh, badge `Top scored`, `Verified`) + "1.8M people match".
- **Home (đang onboarding)**: "Welcome, Alex 👋" · **Next steps for you**: tab `Setup 3` / `Recommendations`; mỗi hàng: nhãn nhóm (OUTBOUND, INBOUND, ENRICHMENT, DELIVERABILITY, ESSENTIALS) · việc cần làm · nút `Start` / `Finish` (vàng, có thanh tiến độ nhỏ) / `✓ Completed` (xám). Bên dưới: "Start strong with expert-built Plays".
- **Home (đã dùng)**: `Edit layout` (tự sắp widget) · `Generate Pipeline ▾`.
  - **Your email stats** (This month): Emails sent / delivered / opened / replied / interested / % bounced, mỗi số có **chip tăng giảm so với kỳ trước** (▲ 7 xanh, ▼ 0 đỏ) + "From Jan 30".
  - **Recent replies**: **hộp thư thu nhỏ ngay trên Home**. Cột trái lọc theo loại phản hồi: *Willing to meet · Follow-up question · Referred to other person · Out of office · Not the right person · Not interested · Unsubscribed* (có đếm); giữa là thư (người gửi, tiêu đề, đoạn đầu, nút `Reply`); phải là thông tin người + công ty + hoạt động 12 tháng. Trống: "No new messages" + "Link your mailbox now".
  - **Your tasks**: tab All / Call / Email tasks, bảng có Company, Local time, Due date.
- Thưởng khi làm onboarding: toast "Onboarding task completed! You earned 5 credits!" kèm thanh tiến độ.

#### A6. AI Assistant
[Chatting with AI](https://mobbin.com/flows/99f2fb61-8a8d-4c44-bf62-9eede46f93fe) · [Assistant](https://mobbin.com/flows/69d9d78d-7c9a-4564-810c-65b4447f7eea)

- Trang Assistant toàn màn (mục sidebar có badge `New`): "What do you want to do, Sam?" + ô nhập có mic + **chip "5 CHATS LEFT"** (hạn mức) + **preset**: Prospecting · Research · Sequencing · Analytics · More.
- Trả lời: dòng thu gọn **"Thought for 5 seconds ›"**, AI **hỏi lại để làm rõ** ("Which meeting metric are you interested in? For example…"), 👍/👎 dưới mỗi câu trả lời. Ô nhập dính đáy, dưới có dòng chính sách dữ liệu AI.
- AI rải khắp app thay vì chỉ một chỗ: `Execute with AI` (top bar), `Research with AI` (bảng tìm kiếm), `Run AI prompt`, AI Filters, Write with AI / Rephrase / Analyze, Generate personas using AI, Auto-draft email.

#### A7. Import CSV và Lists
[Importing a CSV](https://mobbin.com/flows/5b22533b-8aa7-4446-9016-0ffe74856ed1) · [Creating a people list](https://mobbin.com/flows/0aaf039b-926a-44dc-93a1-da5823cc3fa3)

- Lists trống: "Welcome to your lists" + 2 nút `Create a people list` / `Create a company list`.
- Tạo list: panel phải "New List" (tên, List target People/Company, "Add record from": filters hoặc Upload CSV) → modal **Upload CSV**: "You can import up to 100,000 rows at a time", **gợi ý cột nên có** dạng chip (Company Name, Company Website, LinkedIn URL, Contact Email), `Download sample template`, `Help center`, `Select CSV`.
- **Column Mappings**: "8 columns detected · ✓ 8 recognized" + checkbox "Hide Recognised Columns"; mỗi cột là một thẻ có tên cột + tick xanh + dropdown chọn field Apollo + 2 dòng dữ liệu mẫu, cuộn ngang. Bên dưới tab Settings / Data enrichment: **"If contacts already exist in Apollo" → Update the existing record…**, owner mặc định, "Auto-assign accounts" theo domain, "Add to a List?".
- Danh sách lists: bảng theo nhóm People / Companies (List name, # of records, Type, Created by, thời gian "3 seconds ago").

#### A8. Deliverability và cài đặt
[Settings](https://mobbin.com/flows/7086f429-b4c4-425f-ab0b-4be532a627b2) · [Linking a mailbox](https://mobbin.com/flows/a4ab24b7-3fa4-460f-b216-adfd660b8df3)

- **Settings** là một trang riêng có sidebar phụ: ô "Search settings", nhóm Personal settings (Profile, Mailboxes, Notifications…) và Workspace settings (Deliverability suite, Users and teams, Billing and credits, Ideal customer profile › Personas / Buying intent / Scoring, AI content center, Rules of engagement…). Đáy: `Add Teammates`.
- **Deliverability Suite**: tab Overview / Domains / Mailboxes; banner "Deliverability is best managed with a teammate… `Add teammate`"; chọn mailbox; 3 thẻ **Emails sent successfully % · Open rate % · Reply activity %**, mỗi thẻ có số chi tiết (Delivered/Bounced, Opened/Clicked, Total replies/Positive replies), so với tháng trước, dòng "Learn how to improve… here"; biểu đồ "Emails Deliverability and Activity" (Last 7 days); cột **Recommendations** ("Nothing to act on yet").
- **Guided mailbox setup**: modal chia đôi, cột trái tối là danh sách bước có trạng thái (✓ Link mailbox, Mailbox configuration ▾: ✓ Signature, ✓ Sending limits, ✗ Opt-out & open tracking, ✗ Subdomain tracking, ✗ Domain authentication) + **giải thích vì sao bước này quan trọng**; bên phải là form bước hiện tại (toggle chèn link opt-out, nội dung opt-out với cú pháp `<%…%>`, toggle open tracking) + khung cảnh báo cam; đáy `Previous` · `Skip this step` · `Complete`.
- **Personas**: thẻ giải thích "What are persona settings for?" + `Add Persona` + `Generate personas using AI`.

#### A9. Analytics
[Analytics](https://mobbin.com/flows/b22df687-be5d-40d5-b365-4738b180a74b) · [Creating a dashboard](https://mobbin.com/flows/010071f0-6df4-4a4d-93f4-d2f61997cde0) (11 màn)

- Tab Overview · Dashboards · Reports · Goals. Overview: lối tắt Create dashboard / report / goal + "Recent".
- Dashboards: thẻ **Suggested** (Email engagement performance, Call engagement…, "10 Reports · Created by Apollo"); bảng All dashboards có cột trái Favorites / Private / All + Folders.
- **Tạo dashboard**: trống thì "Add your first report" + `Create new report` / `Existing or template`; panel phải "Add report" tab System / Favorites / Your reports / Shared; dashboard có `Select timeframe` + `Add filter`, widget KPI + biểu đồ vùng nhiều series, `Share` / `Edit dashboard`.
- **Goals**: bảng mục tiêu (Name, Metric, Status `Goal met` xanh / `Off track` đỏ / `On track`, Progress %, Actuals, Goal, Assigned to).

#### A10. Workflows (tự động hoá)
[Creating a workflow](https://mobbin.com/flows/814c3dd1-ba11-4c14-ac9c-5ba91c00337b) · [Creating a workflow](https://mobbin.com/flows/9111ce91-aa02-4db9-ad27-f972b623b881)

- Danh sách: toggle Off/On ngay trên hàng · Name · Status · **Actions dạng chip** ("Add to 1 contact list", "Add to sequence") · Target (People/Companies) · Trigger ("Time-triggered") · In progress. Tab Workflows / Templates; nút `Outbound Copilot` (AI) + `Create workflow`.
- **Builder**: canvas dọc; node đầu "When this happens" (chạy mỗi tuần thứ 4) + **ENROLLMENT CRITERIA** ("Saved people matching these attributes… Pre-qualified: 26 · Actual enrollment depends on eligibility at each run"); node "Then do this" (Replying, Filter split criteria) rẽ nhánh **True / False** có nhãn màu; kết thúc "Exit". Panel phải **Build** (kéo thả): Rules (True/false branch, Multi-split branch, Delay, Exit) · Agents `New` (Research with AI, Qualify records) · Actions (Manage sequences, Manage lists, Run AI prompt, Enrich data, Assign manual tasks, Send notifications…). Thanh dưới: `Outline` / `Detail`, undo/redo, zoom. Thanh trên: badge `Draft`, `Launch workflow ▾`. Lưu xong: toast "… was successfully saved and activated".

### 2.3 Danh mục pattern

| # | Pattern | Apollo dùng ở | Đánh giá cho Saella |
|---|---|---|---|
| A-P1 | Panel lọc accordion + chấm báo đang lọc + chip giá trị + `× n` xoá nhanh | People/Companies search | **Nên học**. Đúng màn Companies của Saella |
| A-P2 | 3 ô đếm Total / Net New / Saved đầu kết quả | Search | **Nên học**. Tách lead mới và lead đã lưu |
| A-P3 | Lưu bộ lọc thành "search" và "persona" để dùng lại | Search, Job Titles | **Nên học** |
| A-P4 | Trạng thái email chia 3 mức an toàn (Safe / Caution / Do not send) | Bộ lọc Email Status | **Nên học**. Hợp "flag unreachable addresses" trong PRD |
| A-P5 | Tìm bằng câu tự nhiên + quick filter chip khi chưa lọc gì | Empty state search | **Nên học**. Đưa agent vào đúng màn tìm lead |
| A-P6 | Xem nhanh hồ sơ bằng panel lớn, không rời bảng | People detail | **Nên học** |
| A-P7 | Gợi ý lead kèm cột lý do (Persona Match, Seniority) | Company › New prospects | Nên học. AI phải nói vì sao gợi ý |
| A-P8 | Engagement "Inbound · Outbound" + sparkline 12 tháng + giờ địa phương | Trang người | **Nên học** cho hồ sơ contact |
| A-P9 | Sequence: mỗi bước một thẻ có số liệu riêng + toggle + "nếu không trả lời sau N ngày" | Sequence overview | **Nên học**. Áp cho follow-up của Saella |
| A-P10 | Dải đếm trạng thái người trong sequence, bấm để lọc | Sequence › Contacts | **Nên học**. Đúng cái bảng recipients đang thiếu |
| A-P11 | Bộ quy tắc dùng chung (ruleset): dừng khi trả lời, đánh dấu unresponsive sau N ngày | Sequence settings | Nên học. Cần đối chiếu PRD follow-up |
| A-P12 | Lịch gửi theo giờ hành chính, hiện ngay giờ từng ngày | New sequence | Nên học |
| A-P13 | Composer panel phải, không rời trang; AI Write / Rephrase / Analyze ngay dưới thân thư | Gửi email | **Nên học** |
| A-P14 | AI đưa nhiều phương án để chọn (radio + 👍/👎), không tự thay nội dung | Write with AI | **Nên học**. Khớp nguyên tắc "write chờ duyệt" của agent |
| A-P15 | Onboarding có số đếm trực tiếp ("240M people match") + thẻ lead mẫu thật | Workspace set up | **Nên học**. Saella có ~3M công ty để khoe đúng lúc |
| A-P16 | Next steps: nhãn nhóm + nút Start / Finish / Completed | Home | Nên học |
| A-P17 | Hộp thư phản hồi trên Home, phân loại theo ý định (Willing to meet, Not interested…) | Home › Recent replies | **Nên học**. Thứ Saella thiếu để follow-up |
| A-P18 | KPI có chip ▲▼ so với kỳ trước | Home, Deliverability | Nên học |
| A-P19 | AI có hạn mức hiển thị ("5 chats left"), preset tác vụ, "Thought for Ns", hỏi lại để làm rõ | Assistant | Nên học cho trang Agent |
| A-P20 | Một nút AI toàn cục trên top bar | Execute with AI | Tham khảo. Saella đã có panel agent |
| A-P21 | Map cột: "8 recognized" + ẩn cột đã nhận + 2 dòng mẫu + quy tắc trùng lặp | Import CSV | **Nên học** |
| A-P22 | Hướng dẫn cấu hình có danh sách bước + giải thích "vì sao" ở cột trái | Guided mailbox setup | **Nên học** cho domain DKIM/SPF/DMARC |
| A-P23 | 3 thẻ sức khoẻ gửi + Recommendations | Deliverability suite | **Nên học** |
| A-P24 | Settings có ô tìm kiếm + sidebar phụ chia Personal / Workspace | Settings | Nên học |
| A-P25 | Workflow builder: enrollment criteria có số đếm, nhánh True/False, panel khối kéo thả | Workflows | Tham khảo. Saella chưa có automation tự do |
| A-P26 | Một màu nhấn duy nhất cho nút chính, tím riêng cho AI | Toàn app | **Nên học** nguyên tắc; Saella dùng cam `#BF6603` |

### 2.4 Chức năng đáng cân nhắc cho Saella

Chỉ là ý tưởng; muốn làm phải đối chiếu PRD và hỏi team.

1. **Phân loại phản hồi theo ý định** (Willing to meet, Out of office, Not interested…) và hộp thư phản hồi gom một chỗ.
2. **Net New**: đánh dấu công ty/người chưa từng có trong dữ liệu của mình.
3. **Persona / Saved search**: lưu bộ lọc ngành + vùng + quy mô để dùng lại hoặc giao cho agent.
4. **Mức an toàn của email** (Safe / Caution / Do not send) ngay trên bộ lọc và bảng.
5. **Gợi ý người nên liên hệ trong một công ty** kèm lý do.
6. **Sequence ruleset**: tự dừng khi người nhận trả lời; đánh dấu unresponsive.
7. **Giờ địa phương của người nhận**: Saella phủ 7 nước ĐNÁ, lệch múi giờ.
8. **Guided setup cho domain** theo từng bước có giải thích.
9. **Goals** (mục tiêu gửi / tỉ lệ trả lời) kèm trạng thái On track / Off track.
10. **Thưởng credit khi làm xong onboarding**: chỉ khi Saella có mô hình credit.

### 2.5 Không nên học

- Quá nhiều mục: sidebar ~20 mục, trang công ty 11 tab. Saella nhỏ hơn, giữ gọn.
- Upsell dày: banner nâng cấp trên bảng, ổ khoá trong bộ lọc, nút Upgrade vàng cạnh nút chính. Hai màu vàng cạnh nhau làm loãng nút chính.
- Email/SĐT ẩn sau nút `Access email` tốn credit: chỉ học nếu Saella tính phí theo lượt mở email.
- Thanh thao tác hàng loạt chỉ có icon không nhãn (Sequence › Contacts): khó hiểu với người không làm sales.
- Calls, Meetings, ghi âm cuộc họp, Deals kanban: ngoài phạm vi PRD Saella.

### 2.6 Gợi ý áp vào màn Saella hiện có

| Màn Saella | Lấy từ Apollo |
|---|---|
| Companies (tìm lead) | A-P1, A-P2, A-P3, A-P5, A-P6, A-P7; ý tưởng 2, 3, 5 |
| Contacts | A-P4, A-P8, A-P21; giờ địa phương |
| Campaign / follow-up | A-P9, A-P10, A-P11, A-P12; ý tưởng 6 |
| Bảng recipients của template | A-P10 (dải đếm bấm để lọc), A-P17 (phân loại phản hồi) |
| Template + Write with AI | A-P13, A-P14 |
| Overview | A-P16, A-P17, A-P18 |
| Settings › Sending | A-P22, A-P23, A-P24 |
| Onboarding | A-P15 |
| Agent | A-P14, A-P19 |

---

## 3. Clay: phần gửi email (web)

> Mobbin không có Instantly (đã tìm 3 lần ngày 2026-10-29), nên mục này phân tích phần gửi email của Clay, cùng nhóm cold email.

### 3.0 Nguồn và giới hạn

- Ảnh từ Mobbin, app "Clay" (clay.com) bản web. Dữ liệu mock trong ảnh ghi ngày **2026-03-31** (tên campaign "2026-03-31 New campaign", bảng "Created at Mar 31, 2026"), nên đợt chụp khoảng cuối 3/2026.
- Chỉ có **2 flow** về gửi email: "Create a campaign" (11 màn) và "Campaigns" (2 màn, trùng màn danh sách). Đã tìm thêm 6 lượt theo chủ đề (email account, global inbox/replies, analytics, blocklist, settings, trang 2 của "Clay campaigns"): kết quả chỉ ra Apollo, Juicebox, Klaviyo, Resend, Customer.io, không thêm màn Clay nào.
- Mobbin **chưa có**: tab `Settings` / `Analytics` / `Replies` của một campaign; tab `Email accounts` và `Global blocklist`; trang `Global inbox` và `Global analytics`; kết nối mailbox, sending limits, warm-up, sức khoẻ tài khoản; campaign đang chạy có số liệu. Mọi thứ dưới đây chỉ là **bước dựng campaign tới lúc sẵn sàng Launch**.
- Lưu ý trùng tên: Mobbin còn có một app "Clay" khác (clay.earth, CRM cá nhân: Home dạng timeline, People, Groups). Không liên quan, đã bỏ qua.
- Ngoài phạm vi (chỉ nhắc): bảng dữ liệu/enrichment (Clay table, "Find leads", "Signals"), Claygents, "AI context".

### 3.1 Khung app (IA)

```
┌────────────────┬─────────────────────────────────────────────────────┐
│ 🌈 clay        │          [⚡ Upgrade your plan] ▤ Credits  ?  🔔  AS │
├────────────────┼─────────────────────────────────────────────────────┤
│ Home           │ [icon] Campaigns   [🔍     ] [✉ Global inbox]        │
│ Find leads   › │                    [📈 Global analytics] [+ New campaign]
│ Signals        │ Sequences | Email accounts | Global blocklist        │
│ Ads  [Upgrade] │ Name  Status  Leads  Sent  Reply rate  Bounce rate   │
│ Campaigns      │       Owner  Last modified                           │
│ Claygents      │ ▸ 2026-03-31 New campaign  ▯▯ Draft  --  --  --  --  │
│                │                                                      │
│ Exports        │                                                      │
│ Trash          │                                                      │
│ Settings       │                                                      │
│ AI context     │                                                      │
│ Resources    › │                                                      │
└────────────────┴──────────────────────────────────────────────────────┘
```

- **Sidebar ngắn**: Home, Find leads ›, Signals, Ads (chip `Upgrade`), **Campaigns**, Claygents. Cụm dưới: Exports, Trash, Settings, AI context, Resources ›.
- **Top bar**: nút xanh `Upgrade your plan`, `Credits`, trợ giúp, chuông, avatar kèm tên workspace ("Alex's Workspace").
- **Campaigns là một mục duy nhất** gom cả gửi lẫn hạ tầng gửi: tab `Sequences` (danh sách campaign), `Email accounts`, `Global blocklist`. Hai trang toàn cục (`Global inbox`, `Global analytics`) là nút viền ở đầu trang, không phải tab.
- **Trong một campaign**: breadcrumb `All Files / <bảng nguồn> / <tên campaign> ▾`; tab `Sequence · Settings · Analytics · Replies`; góc phải `✎ Draft` (badge trạng thái) · `Create events table` · `Launch campaign` (xanh, mờ khi chưa đủ điều kiện). Đáy màn là **thanh tab kiểu workbook**: `Overview` · các bảng dữ liệu · tab campaign · `+ Add`.
- Màu: nền trắng / xám nhạt, **một màu nhấn xanh dương** cho nút chính (New campaign, Select table, Save campaign, Launch campaign). Tím chỉ dùng cho biến `{{…}}` và icon AI ✦.

### 3.2 Flow

#### C1. Tạo campaign: từ Home tới sẵn sàng Launch
[Create a campaign](https://mobbin.com/flows/aba7409b-240b-4041-bdae-45002fabb00d) (11 màn)

1. **Home**: "Hey Alex, ready to get started?" + ô "Ask me anything about Clay or describe what you'd like to do…" + 4 thẻ lối tắt: `Find leads`, `Import data`, **`Create a campaign`** ("Build and automate your outreach campaigns."), `Start from template`. Bên dưới là bảng All Files (ngoài phạm vi).
2. **Campaigns**: bấm `+ New campaign` tạo ngay một bản nháp, **tên mặc định theo ngày** "2026-03-31 New campaign". Không có modal đặt tên.
3. **Màn dựng campaign, bố cục 2 cột** (khi chưa có lead):
   - Cột trái **Campaign setup**: mô tả một câu "Import leads, draft message sequences, and select which email accounts to send from." + link `video tutorial` / `documentation`.
   - Accordion **Leads**: nhãn "Lead email address" + nút `+ Add lead list`.
   - Accordion **Messages (0/4)** kèm chip xám **`Missing fields`**. Toggle **`Enable HTML`** có cảnh báo in nghiêng: "Use HTML to add links, images, formatting, and tracking. HTML can negatively affect deliverability for cold outbound." (mặc định tắt). Nút `+ Add a message`.
   - Đáy cột trái: chip `✦ 1 per lead sequenced` + nút `✓ Saved` (mờ khi không có thay đổi).
   - Cột phải (nền xám) **Draft messages with AI** `Beta`: "Generate a personalized email using your `business context`", ô lớn "Describe the goals of your campaign to generate your first message" + nút `Generate campaign`; bên dưới **4 chip mục tiêu soạn sẵn**: "Reach out to warm leads who have already engaged" · "Book demo meetings with cold prospects" · "Announce a new product launch" · "Drive signups for an upcoming event or webinar".
4. **Chọn nguồn lead**: modal **Select table**: ô Search, danh sách bảng (mỗi hàng có `›` để đi vào), vào trong thì có **breadcrumb `← Home / UX Directors in Finance`**; chọn một bảng thì hàng đổi xanh + ✓, nút `Select table` mới sáng.
5. **Sau khi chọn**: ô Lead email address hiện **"Rows from: UX Directors, Finance Industries › ✉ Work"** (bảng › cột email) có `×` và `▾`. Dòng giải thích: **"We will automatically deduplicate records based on this field to ensure each lead is sequenced only once."** Banner xanh: **"This is a suggested lead email address column. Save to confirm."** (Clay tự đoán cột email, người dùng phải lưu để xác nhận). Nút đáy đổi thành `Save campaign`.
   - Bố cục thành **3 cột**: trái là setup; **giữa là danh sách lead** (`Search lead emails…` + nút lọc; tiêu đề `Leads (10)` + icon link; mỗi hàng: số thứ tự + chip email, hàng thiếu email hiện chip xám **`Empty`**); phải là segmented **`Sequence` / `Lead data`** và vùng AI.
   - Trong 10 lead mẫu, 5 hàng là `Empty`. Không thấy cảnh báo hay đếm riêng số lead thiếu email.
6. **Soạn bước đầu**: `+ Add a message` thay cột trái bằng panel **Message drafting** (có ✕): `Email name (internal only)` = "Opener"; `Subject` (placeholder "Subject text, type / for commands"); `Body`; dưới mỗi ô là dòng gợi ý **"Type '/' to Use AI, reference column data and more!"**. Đáy: `Cancel` · `Save draft`.
   - Cột phải hiện **thẻ preview "#1"** viền xanh: "No subject" / "No message content" khi trống, **cập nhật ngay khi gõ**.
7. **Biến cá nhân hoá**: subject "{{firstName}}, quick idea for {{Company Name}}", body "Hey {{firstName}}, …". Trong preview biến được tô nền tím.
   - Ở một màn, preview của lead #1 hiện subject thành **"{firstName}, quick idea for {Could you please specify which company's name you are referring to?}"**: biến bị thay bằng một câu hỏi lại (có vẻ do AI điền). Thân thư còn chữ "£company" (sai cú pháp biến) hiển thị như chữ thường. **Không thấy cảnh báo** cho cả hai lỗi này.
8. **Lưu xong**: `Messages (1/4)`, chip `Missing fields` biến mất; bước hiện thành một hàng `✉ Opener` + icon thùng rác đỏ. Thẻ preview "#1" có nút bút chì để sửa; dưới thẻ là **nút tròn `+`** để thêm bước kế. Nút **`Launch campaign` sáng xanh**.
   - Không thấy ô "chờ N ngày" giữa các bước trong ảnh; tối đa 4 message (đếm `x/4`).
9. **Quay lại danh sách**: hàng campaign có status **`▯▯ Draft`**, các cột số liệu hiện `--`, Owner có avatar, Last modified "16 minutes ago".

#### C2. Danh sách campaign
[Campaigns](https://mobbin.com/flows/70c56008-83e7-4709-b712-37e9b2ef5e55) (2 màn)

- Đầu trang: icon + "Campaigns", ô tìm, `✉ Global inbox`, `📈 Global analytics`, `+ New campaign` (xanh).
- Tab `Sequences` · `Email accounts` · `Global blocklist`.
- Bảng: **Name · Status · Leads · Sent · Reply rate · Bounce rate · Owner · Last modified**. Chỉ hai tỉ lệ được đưa lên danh sách là **Reply rate** và **Bounce rate** (không có Open rate). Số chưa có hiện `--`.
- Màn thứ hai giống hệt, chỉ khác Last modified đổi từ "16 minutes ago" sang "Mar 31, 2026" (thời gian tương đối khi gần, ngày cụ thể khi xa).
- Không có màn mở tab Email accounts / Global blocklist hay hai nút Global.

### 3.3 Danh mục pattern

| # | Pattern | Clay dùng ở | Đánh giá cho Saella |
|---|---|---|---|
| C-P1 | Mục Campaigns gom luôn hạ tầng gửi: tab Sequences / Email accounts / Global blocklist | Campaigns | **Nên học** cấu trúc; Saella cân nhắc để Sending/domain ở Settings nhưng có lối tắt từ Campaign |
| C-P2 | Nút `Global inbox` và `Global analytics` ngay đầu danh sách campaign | Campaigns | **Nên học**. Phản hồi và số liệu toàn cục cách danh sách một cú bấm |
| C-P3 | Danh sách chỉ đưa Reply rate + Bounce rate, bỏ Open rate | Campaigns | **Nên học**. Hai số phản ánh kết quả và sức khoẻ; open rate kém tin cậy |
| C-P4 | Bấm New campaign tạo nháp ngay, tên mặc định theo ngày | New campaign | Nên học. Bớt một modal; đổi tên sau |
| C-P5 | Màn dựng campaign là checklist accordion có đếm (`Messages (0/4)`) + chip `Missing fields`; `Launch` mờ tới khi đủ | Sequence tab | **Nên học**. Đúng màn Campaign/gửi batch |
| C-P6 | Chọn nguồn lead bằng modal duyệt thư mục có breadcrumb + search | Select table | Tham khảo. Saella chọn list/segment, không có cây thư mục bảng |
| C-P7 | Nói rõ quy tắc trùng lặp: "deduplicate… each lead is sequenced only once" | Leads | **Nên học**. Quan trọng khi batch tới 5.000 người |
| C-P8 | Hệ thống tự đoán cột email, banner "suggested… Save to confirm" | Leads | **Nên học**. Khớp nguyên tắc agent đề xuất, người dùng duyệt |
| C-P9 | Danh sách lead đánh số, hàng thiếu email hiện chip `Empty` | Cột giữa | Nên học ý; nhưng phải thêm đếm "5/10 thiếu email" (Clay không có) |
| C-P10 | Bố cục 3 cột: setup · lead · preview, preview đổi theo lead đang chọn | Sequence tab | **Nên học**. Xem thư thật của từng người trước khi gửi |
| C-P11 | Preview cập nhật ngay khi gõ, biến tô màu riêng | Message drafting | **Nên học** cho Template editor |
| C-P12 | `/` trong ô subject/body để gọi AI và chèn cột dữ liệu | Message drafting | **Nên học**. Một cú pháp cho cả biến và Write with AI |
| C-P13 | Ô AI "Describe the goals…" + 4 chip mục tiêu soạn sẵn ở trạng thái trống | Draft messages with AI | **Nên học**. Empty state của Template + Write with AI |
| C-P14 | Toggle `Enable HTML` mặc định tắt, ghi rõ hại deliverability cho cold outbound | Messages | **Nên học**. Hợp B2B cold email |
| C-P15 | Tên email nội bộ ("Opener") tách khỏi subject | Message drafting | Nên học. Dễ đọc danh sách bước follow-up |
| C-P16 | Bước sequence là hàng gọn + thẻ preview đánh số `#1` + nút `+` tròn thêm bước | Messages | Tham khảo. Apollo (A-P9) đầy đủ hơn: có số liệu và "chờ N ngày" |
| C-P17 | Badge `Draft` + nút `Saved` mờ / `Save campaign` sáng để báo trạng thái lưu | Header, đáy | Nên học |
| C-P18 | Last modified tương đối khi gần, ngày tuyệt đối khi xa | Campaigns | Nên học |
| C-P19 | Thanh tab workbook ở đáy (Overview · bảng · campaign · + Add) | Campaign editor | Không hợp. Saella không lấy bảng làm trung tâm |

### 3.4 Chức năng đáng cân nhắc cho Saella

Chỉ là ý tưởng; muốn làm phải đối chiếu PRD và hỏi team.

1. **Global blocklist**: danh sách email/domain không bao giờ gửi, dùng chung mọi campaign (Clay có tab riêng; chưa thấy nội dung).
2. **Global inbox** gom phản hồi của mọi campaign, mở từ danh sách campaign.
3. **Quy tắc dedupe nói rõ trên màn**: mỗi người chỉ nhận một lần trong campaign, và hiện số đã gộp.
4. **Preview theo từng người nhận** ngay trong màn gửi batch, chọn người ở cột giữa.
5. **Chip mục tiêu soạn sẵn** cho Write with AI theo ngữ cảnh ĐNÁ (ví dụ: chào hàng nhà phân phối, mời hội chợ).
6. **Checklist "Missing fields"** chặn `Launch` khi thiếu lead, nội dung, tài khoản gửi, domain chưa xác thực.
7. **Cảnh báo HTML/tracking** hại deliverability khi bật.

### 3.5 Không nên học

- **Không kiểm biến trước khi lưu**: preview hiện "{Could you please specify which company's name you are referring to?}" thay cho tên công ty, và "£company" lọt vào thân thư mà không có cảnh báo. Saella phải báo biến lỗi/thiếu dữ liệu theo từng người nhận trước khi cho gửi.
- **Lead thiếu email chỉ hiện `Empty`**, không đếm, không có lối lọc/loại. Với batch 5.000 người, phải có số tổng và hành động.
- Upsell rải nhiều chỗ: nút xanh `Upgrade your plan` cùng màu với nút chính, chip `Upgrade` trong sidebar.
- Campaign gắn chặt vào "bảng" (breadcrumb qua bảng, thanh tab workbook): khó hiểu với người không quen spreadsheet.
- Nút `Create events table` không có giải thích trên màn.

### 3.6 Gợi ý áp vào màn Saella hiện có

| Màn Saella | Lấy từ Clay |
|---|---|
| Campaign / gửi batch | C-P4, C-P5, C-P7, C-P9, C-P10, C-P14, C-P17; ý tưởng 3, 4, 6, 7 |
| Danh sách campaign (Campaign) | C-P1, C-P2, C-P3, C-P18 |
| Template + Write with AI | C-P11, C-P12, C-P13, C-P15; ý tưởng 5 |
| Bảng recipients của template | C-P10 (preview theo người), C-P9 + cảnh báo biến lỗi theo hàng (bài học từ 3.5) |
| Contacts | C-P7 (dedupe), C-P9 (thiếu email) |
| Settings › Sending | C-P1 (Email accounts, blocklist); ý tưởng 1 |
| Overview | C-P2 (lối vào inbox và analytics toàn cục) |
| Agent | C-P8 (đề xuất rồi "Save to confirm"), C-P13 |
| Onboarding | Thẻ lối tắt trên Home (`Create a campaign`, `Import data`): tham khảo |
| Companies | Không có (phần tìm lead của Clay ngoài phạm vi) |

---

## 4. HubSpot (web)

### 4.0 Nguồn và giới hạn

- Ảnh từ Mobbin, app "HubSpot" bản web. Ngày thấy trong ảnh: **1/8/2025 – 20/8/2025** (một đợt chụp). Tài khoản mẫu đang dùng thử (banner "You have N days left in your Service Hub Enterprise trial").
- Đã quét 14 nhóm chủ đề: bảng contacts, hồ sơ contact, hồ sơ công ty, sửa cột/view, lọc, thao tác hàng loạt, import, marketing email (soạn, gửi, lên lịch, A/B, báo cáo), sequences, lists, AI (Breeze Copilot, sinh subject, Customer Agent), onboarding + user guide, settings, social.
- Mobbin chỉ trả về ảnh xem trước rải đều trong mỗi flow, không phải tất cả màn. Mô tả dưới đây chỉ là những màn đã thấy.
- **Không thấy trên Mobbin**: trang hồ sơ **công ty** (chỉ thấy thẻ Companies bên trong hồ sơ contact), bảng Companies riêng, cài đặt **domain gửi / DKIM / SPF / DMARC**, tab **Recipients** của email đã gửi có dữ liệu (chỉ thấy tab ở trạng thái "Email scheduled"), bước chọn template riêng của sequence, Marketing Email ở trạng thái đã có số liệu theo từng người.
- HubSpot là bộ CRM đủ loại (Service, Commerce, CMS, Deals). Phần ngoài phạm vi Saella (Tickets, Products, Payments, Customer Agent cho chăm sóc khách) chỉ ghi ngắn để biết.

### 4.1 Khung app (IA)

```
┌──┬──────────────────────────────────────────────────────────────────┐
│🟠│ [ Search HubSpot      ⌘K ] (+)  Upgrade 📞 🏪 ? ⚙ 🔔  ✦Copilot  SL▾│
├──┼──────────────────────────────────────────────────────────────────┤
│🔖│  Contacts ▾  6 records          🔒Data Quality [Actions▾][Import][Create contact]
│👤│  ┌All contacts ×┬Newsletter…┬Unsubscribed┬All customers┬USA…┐ + Add view (5/5)  All Views
│📣│  Contact owner▾ Create date▾ Last activity date▾ Lead status▾ +More │ ≡ Advanced filters  [↶][⧉][💾]
│📄│  [Search name, phone, em…]                       [Export][Edit columns]
│💼│  ☐ NAME ⇅⋮ │ EMAIL ⇅⋮ │ PHONE NUMBER │ LEAD STATUS │ …           │
│🛒│  ‹ Prev [1] Next ›   25 per page ▾                                │
│🎧│                                                                   │
│🗄│  (rail icon; rê chuột mở menu nổi theo nhóm)                       │
│⚙ │                                                                   │
│📊│                                                                   │
└──┴──────────────────────────────────────────────────────────────────┘
```

- **Rail trái chỉ có icon**, nền xanh than. Rê vào icon mở **menu nổi** có tiêu đề nhóm:
  - **CRM**: Contacts, Companies, Deals, Tickets · Lists, Inbox, Calls, Tasks, Playbooks, Message Templates, Snippets.
  - **Marketing**: Campaigns, Email, Social, Ads, Events, Forms, Buyer Intent, Lead Scoring, Journeys `BETA`, Marketing Analytics. Mục cần nâng cấp có icon tròn cam.
  - **Sales**: Sales Workspace, Documents, Meetings Scheduler, Sequences, Activity Feed, Forecast, Sales Analytics.
  - **Commerce**: Overview, Payments, Invoices, Payment Links, Quotes, Orders, Products, Subscriptions.
- **Top bar**: ô `Search HubSpot` có phím tắt `⌘K`, nút `+` (tạo nhanh), `Upgrade`, gọi điện, marketplace, help, settings, chuông thông báo, **`✦ Copilot`** (mở panel AI bên phải), menu tài khoản.
- **Menu tài khoản**: Profile & Preferences · Account (tên + ID) · **"Finish your account setup 36%"** kèm thanh tiến độ · Create a user · Pricing & Features · Account & Billing · Product Updates · HubSpot Academy · Training & Services · Sign out.
- **Dải banner trial** chiếm hẳn một hàng trên cùng (xanh tím, nút `Talk to Sales` / `View Pricing`, `Switch trial view ▾`).
- **Màu**: chữ link xanh teal, nút chính **cam san hô** (Create contact, Create email, Review and publish), nút phụ viền cam. Header panel/modal tô **gradient teal**. AI dùng **hồng/magenta** (badge `✦ AI`, khung Breeze).
- **Mẫu trang danh sách dùng lại khắp app**: Contacts, Lists, Marketing Email, Products, Journeys, Social đều cùng bố cục: tiêu đề có số bản ghi → hàng tab view → hàng bộ lọc nhanh → ô tìm + Export/Edit columns → bảng → phân trang.

### 4.2 Flow

#### H1. Bảng Contacts: view, lọc, sửa cột, sửa ô
[Filtering a view](https://mobbin.com/flows/a01a3007-18b2-4697-8680-eea79c12067a) (10 màn) · [Editing columns](https://mobbin.com/flows/2b5e102c-789f-45a3-827b-882b8f06580a) · [Editing cells](https://mobbin.com/flows/0c1fe949-715b-427a-98d4-b41948830389) · [Searching contacts](https://mobbin.com/flows/3ab2ac7e-75e1-4fb7-82af-6fcc831cc921)

- **Tiêu đề có số đếm**: "Contacts ▾ · 6 records"; tìm "kim" thì đổi ngay thành "1 record".
- **View đã lưu là tab ngang**: All contacts · Newsletter subscribers · Unsubscribed · All customers · USA customers; tab đang mở có `×`. Cuối hàng: **`+ Add view (5/5)`** (hiện hạn mức số view) và `All Views`.
- **Bộ lọc nhanh dạng dropdown chữ** ngay dưới tab: Contact owner ▾, Create date ▾, Last activity date ▾, Lead status ▾, `+ More`, `≡ Advanced filters`. Khi đã chọn, dropdown đổi nền xanh nhạt + có `×`; hiện thêm `Clear all`. Advanced filters có chấm báo khi đang bật.
- **Nhóm 3 nút nhỏ** bên phải hàng lọc: hoàn tác ↶, sao chép view ⧉, **lưu view 💾** (sáng lên khi view đã bị đổi).
- **Panel "All Filters"** trượt từ phải, chia 2 cột: trái là *Quick filters* ("These filters were set within the current table", `Hide`) + **AND** + *Advanced Filters* theo **Group 1 … `and` … `+ Add filter` … OR … `+ Add filter group`**; phải là danh sách thuộc tính có ô tìm, nhóm theo "Contact activity" (Last contacted, Recent sales email open date, Number of times contacted, Now in Sequence…), mỗi dòng có icon kiểu dữ liệu. Chọn xong thì cột phải thành **"Edit filter"**: Country/Region · `contains exactly ▾` · `Add values`.
- **Edit columns**: modal "Choose which columns you see", trái là ô tìm + checkbox theo nhóm (ASSOCIATIONS, CONTACT INFORMATION, FACEBOOK ADS PROPERTIES), phải là **SELECTED COLUMNS (10)** kéo-thả sắp xếp, mỗi dòng có `×`, **`Frozen columns [0 ▾]`**. Đáy: `Apply` · `Cancel` · `Remove All Columns`, và dòng "Don't see the property you're looking for? Create a property".
- **Đầu cột**: tên cột + ⇅ sắp xếp + ⋮ menu cột.
- **Sửa ô ngay trong bảng**: bấm ô Lead Status hiện dropdown tại chỗ ("New ▾"); lưu xong có **toast góc trái dưới "'Lead Status' changes saved · Undo"**.
- Ô trống hiển thị `--`. Contact mẫu của HubSpot có avatar logo cam và hậu tố "(Sample Contact)".

#### H2. Thao tác hàng loạt và thêm vào list
[Adding contacts to a list](https://mobbin.com/flows/02f21c4d-dee9-4ba2-85a8-3c58a7045ffa)

- Tick hàng thì **thanh tiêu đề bảng biến thành thanh thao tác**: "2 contacts selected" · `Enrich records` (khoá) · `Assign` · `Edit` · `Delete` · `+ Create tasks` · `Enroll in sequence` (khoá) · `More ▾` · `×` để bỏ chọn. Mỗi thao tác có **icon + chữ**.
- `More ▾`: Check enrichment coverage · Add to static list · Enroll in workflow · Edit communication subscriptions; mục không dùng được thì **xám** (Add legal basis…, Update double opt-in status).
- Add to static list → modal "Create a new list" (một ô tên) → modal **"Success · 2 contacts were added to the new list: New Contacts ↗"** + `Got it`. Kết quả có link tới list vừa tạo.

#### H3. Hồ sơ contact: xem nhanh và trang đầy đủ
[Preview a contact](https://mobbin.com/flows/f13df366-f5e6-458b-8f3d-b9f586a02014) · [Contact detail](https://mobbin.com/flows/7b2c3fc5-b782-4457-afc0-13b2cdd9090e) (10 màn)

- **Xem nhanh**: bấm tên trong bảng mở **panel phải** (header teal "Leonard Kim" + ✕), bảng vẫn ở phía sau. Đầu panel: avatar, tên, email + nút copy, `View record`, `Actions ▾`. Hàng **6 nút tròn có nhãn**: Note · Email · Call · Task · Meeting · More.
- Trong panel, các khối **thu gọn được**: *Breeze record summary* → *About this contact* → *Upcoming activities* (ô tìm, chip lọc "(5) Activity ×", `All upcoming`, trống: "No activities.") → *Contacts (0)* / *Companies (0)* / *Deals (1)* mỗi khối có `+ Add` và câu giải thích khi trống ("See the businesses or organizations associated with this record.").
- **Trang đầy đủ 3 cột**:
  - Trái: `‹ Contacts` (quay lại) · `Actions ▾` · avatar + tên + chức danh + email · hàng nút Note/Email/Call/Task/Meeting/More · khối **About this contact** (Email, Phone number, Preferred channels, Lead status, Create date "08/01/2025 1:57 PM GMT+7") · **Communication subscriptions** ("View subscriptions") · **Website activity** (1 SITE VISITS · 0 PAGES VIEWED · Most recent visit).
  - Giữa: tab **Overview · Activities · Intelligence** + `⚙ Customize`. Overview là các thẻ liên kết (Contacts, Companies có bảng nhỏ + nhãn `Primary`, Deals, Tickets, Subscriptions, Payments), mỗi thẻ có `+ Add` và ⚙.
  - Phải: **Breeze record summary**, Companies (1) có nhãn `Primary`, Deals (0)… Có nút `»` thu cột phải.
- **Tab Activities (dòng thời gian)**: ô `Search activities` · `Collapse all ▾` · tab con **Activity · Notes · Emails · Calls · Tasks · Meetings**. Nhóm theo tháng ("August 2025"). Mỗi mục là thẻ mở/thu: "Logged call · with Brian Halligan" · `Actions ▾` · thời gian "Aug 1, 2025 at 1:57 PM GMT+7" · nội dung · các trường sửa tại chỗ (Contacted, Outcome "Select an outcome ▾", Direction, Date, Time) · `Add comment` · "2 associations ▾". Nút trên cùng: `Log Call` · `Make a phone call`.
- **Tab Intelligence**: dòng "This record is up-to-date with the latest HubSpot enrichment data."; hàng thuộc tính (Lifecycle stage, Related company, Employment role, City, State, Region); icon mạng xã hội; Industry; **Company description**; **Company keywords dạng chip** (Advertising, B2B, SaaS…); thẻ **"✦ Contact Outreach"** (Email, Job sub role, Job seniority, LinkedIn).

#### H4. Breeze: AI trong app
[Chatting with Breeze](https://mobbin.com/flows/ba5a266e-a81f-4fe0-881f-378885c57930) · [Generating subject line](https://mobbin.com/flows/e33d6b78-9bac-4b1e-9c61-7400b5ce8d5c) · [Chatting with support assistant](https://mobbin.com/flows/c872c12b-a49e-49d1-a134-fbdc24edf157) · [Chatting with agent](https://mobbin.com/flows/bf821333-5d55-49a9-9700-4e0f2e02c34e)

- **Breeze record summary** (trên hồ sơ contact): khung viền hồng, badge `✦ AI`, tiêu đề "Contact summary", **"Generated Aug 3, 2025" + nút làm mới ↻**, một đoạn tóm tắt hoạt động (cuộc gọi, email, cuộc hẹn, task còn mở), 👍 👎 copy, nút `✦ Ask a question`. Khi chưa có dữ liệu: "There are no associated activities and further details are needed to provide a comprehensive summary."
- **Breeze Copilot** (nút `✦ Copilot` trên top bar) mở **panel phải**, đẩy nội dung trang sang trái (không đè). Đầu panel: `Chats` · `+` (chat mới) · mở rộng ⤢ · ✕. Màn chào: logo Breeze Copilot, badge `BETA`, "How can Breeze Copilot help you?" + 3 gợi ý (**Summarize** a contact, company or deal · **Draft** a blog post, email or LinkedIn article · **Prepare** for meetings, calls or events) + `See more prompts ›`. Đáy: ô nhập, link `Prompts`, dòng "AI-generated content may be inaccurate. See terms".
- Trả lời dài có định dạng (tiêu đề, danh sách), cuối có **câu hỏi lại** ("Would you like to include a call-to-action button…?"), dòng **"Reasoned for 9 seconds."**, 👍 👎 copy, ô "Type a follow-up message".
- **Sinh subject line**: trong ô Subject line có `Personalize` và `+ Generate`. Bấm Generate mở popover **"Generate subject line"** (badge `✦ AI`): "Subject lines are generated from your email body content." + 3 dòng skeleton hồng khi đang tạo. Ô Preview text cũng có `Generate`.
- **Danh sách lists**: nút `🔒 Use AI to create filters` ở góc trên trình tạo list (bị khoá theo gói).
- **Support Assistant** (chat hỗ trợ, khác Copilot): panel nổi góc phải, trả lời từng bước đánh số kèm link bài hướng dẫn, cho đính kèm ảnh.
- **Customer Agent** (Service Hub, ngoài phạm vi): trang có checklist "Finish setting up Sam_bot [4]" (Add content to train · Test · Assign to a channel) và panel `Preview` để thử chat; câu trả lời có mục **Sources** dẫn nguồn.

#### H5. Import file
[Importing a file](https://mobbin.com/flows/76a881cf-e903-4eaf-bb60-f7a779cd06c2) (14 màn) · [Data integration](https://mobbin.com/flows/586fb102-5242-4727-99c8-e1357943c698)

- **Trang Data integration**: banner hạn mức "You've used 4 of 1,000 contacts. Once you reach the 1,000 contact limit… `Upgrade`". 3 thẻ: **Import from a file** (`Import data`) · **Sync from apps** (`Connect an app`) · **Migrate your data** (`Sign up to migrate`).
- **Trống**: "Get started with your first import" + 3 dòng hướng dẫn (importing a file csv/xls/xlsx · import set up guide · **Download a sample file**) + `Import a file`. Có lịch sử thì thay bằng bảng **Past imports**: Name · New records · Updated records · New associations · **Error count** · Source · User · Created.
- **Wizard 4 bước toàn màn** có stepper trên cùng: **Type → Upload → Map → Details**, "Step 3 of 4". Đáy: `Back` · `Cancel` · `Next ›`, và "Tip: press Enter/Return to continue".
  - Type: "What kind of data is in your file?" lưới thẻ có minh hoạ + checkbox (Companies, Contacts, Deals…), chọn nhiều để tạo và liên kết cùng lúc.
  - **Map**: "Map columns in your file to contact properties". Khung **Mapping Guide**: "✓ Ready to import Contacts", **"Properties required to create Contacts: Map one of [Email] [✓ First Name] [✓ Last Name]"**, bên cạnh "Existing Contacts won't be updated." Dòng **"✓ 0 errors found, of 3 rows scanned"**. Bảng: Column header from file · **Preview information** (2 giá trị mẫu) · Mapped ✓ · Import as ▾ · HubSpot property ▾ · Manage existing values ("Don't overwrite"). Lọc `All mapped statuses ▾`, `Search columns`. Đáy: **"You have 2 unmapped columns"** + checkbox "Don't import data in unmapped columns".
  - **Details**: Import name · checkbox "Create a contacts list from this import" · **checkbox cam kết bắt buộc**: "I agree that all contacts in this import are expecting to hear from my organization… this list wasn't purchased, rented, appended, or provided by a third party." · khung upsell enrichment · "Properties in your import are used in: Not used in any workflows or lists." Nút `Finish import`.
- **Kết quả import** (trang riêng): tên file, loại, ngày giờ "Sunday, August 3, 2025 7:51 PM", người import. Thẻ **Summary**: IMPORT ROWS 2 · NEW RECORDS 2 · UPDATED RECORDS -- · NEW ASSOCIATIONS -- + `View Contacts`. Thẻ phụ "Fix formatting issues… `Clean up your import`". Minh hoạ tick lớn + **"Import completed with no errors"**.

#### H6. Lists (danh sách/segment)
[Lists](https://mobbin.com/flows/e4d2d7d8-1e7d-4584-bdcc-1b234e918250) · [Creating a list](https://mobbin.com/flows/1e74cee0-b44c-443d-81ff-c5e8e9c1ac53) (15 màn) · [Creating a folder](https://mobbin.com/flows/9bf02cd8-f30d-40c8-8d80-7509b420e963)

- Bảng Lists cùng mẫu trang danh sách: tab view All lists / **Unused lists** / **Recently deleted**, `Folders`. Cột: Name · List size · **Type** (chấm xám `Static` / chấm xanh `Active`) · Object · Last updated (+ "by Sam Lee") · Creator · Folder · **Used in (count)**. Mỗi đầu cột có icon ⓘ giải thích.
- **Trình tạo list**: tên mặc định có ngày giờ ("Unnamed list 8/3/2025 10:52:33 PM", sửa tại chỗ), badge loại đối tượng, `Change object`, **"Estimated size: 0 tickets"**. Cột trái Filters ("This list doesn't have any filters" + `+ Add filter`); thêm lọc thì hiện cột giữa "Add filter" chọn thuộc tính; vùng phải là kết quả xem trước ("Add filters to start building your list"). Nút `🔒 Use AI to create filters` · **`Review and save`**.
- **Trang list đã lưu**: badge `ACTIVE`, "Size: 1 ticket", tab **Filters · Performance · Activity · Settings**. Banner xanh **"Processing is complete · Your list has been processed and is now ready to use."** Cột trái là bộ lọc dạng chữ ("Create date is This week") + `Test …` + `Edit filters`; phải là bảng bản ghi. Settings: **Exclusions** (loại trừ cả list hoặc từng bản ghi, "You can exclude up to 10 lists. 0/10"), Auto-convert to static, Notifications.

#### H7. Marketing email: soạn
[Creating an email](https://mobbin.com/flows/0cda0199-733b-4e7b-bcc6-1c59c9f46e24) · [Selecting a pattern](https://mobbin.com/flows/02fc70a5-8e68-48cc-ac5b-0591d7649d87) · [Editing sending details](https://mobbin.com/flows/5765591e-ef87-416c-a46f-05f27ec552a0)

- **Chọn template**: "Select a template", tab `Drag and drop` / `Custom`; cột trái ô tìm + nhóm có số đếm (Saved templates 0, All templates 46, Ecommerce 21, Newsletter 4, Plain text 6…); lưới thẻ ảnh thu nhỏ, thẻ đầu **"Start from scratch"**; `Create new template`.
- **Trình soạn toàn màn** (rời app shell): thanh trên tối `Exit` · `File ▾` · `Help ▾` · tên email sửa tại chỗ ✎ · trạng thái **"✓ Autosaved"** / "Saved" · `Preview and test ▾` · **`Review and publish`** (cam).
- **Tab theo bước** ngay dưới: **Edit · Inbox · Send to · Schedule · Setup · Automate**. Góc phải: undo/redo, `A/B test`.
- Edit: rail trái 3 icon (Add `+`, Contents (cây Section/Column/Image/Text), Design ✎). Panel **Add**: tab Modules / Sections, nhóm Base (Text, Button, Social, HTML), Media, Structure, Ecommerce (`BETA`). Canvas giữa có toggle desktop/mobile, `Display options ▾`, **"Estimated size: 47.9KB"**. Biến cá nhân hoá hiện thành **chip** "👤 First Name" ngay trong tiêu đề. Rail phải nổi có icon AI ✦, comment, lịch, checklist.
- Panel thuộc tính module: Background (`All devices` toggle), Width Full/Content, Background type Color/Pattern, ô màu hex, **khung lưu ý** "Not all email clients will display a background image…", Spacing/Padding.
- **Inbox**: Subject line (Personalize · Generate) + cảnh báo emoji · `Add smart rule` · Preview text · From name · From address + ghi chú "To improve deliverability, this address will be **modified and sent from a HubSpot domain**." · checkbox "Use as reply-to address" + "Make sure you're using a HubSpot connected inbox… to track replies".

#### H8. Marketing email: chọn người nhận, lên lịch, A/B, automate
[Scheduling an email](https://mobbin.com/flows/0acfc9a2-f70c-4685-9a06-ba7c33ddf3e2) · [Creating A/B test email](https://mobbin.com/flows/779de954-4501-4d88-bca8-c6b5a66796a8) · [Marketing email](https://mobbin.com/flows/9ce1a574-3063-4acd-b1a2-e2846d3eeaf9)

- **Send to**: form trái: Sending method ("To a list of contacts") · Subscription type ("Marketing Information") · **Send to** (chip list "New Contacts (3) ×") · **Don't send to** (chip contact cụ thể) · Advanced: checkbox "Don't send to **unengaged contacts**". Cột phải nền xám: **Estimated recipients "2 out of 3"** + "1 contact won't be sent this email. **(review reasons)**". Số đổi ngay khi chọn list.
- **A/B test**: panel phải "Create A/B test": tên 2 phiên bản A/B · "How many recipients should receive the A/B test? [50] %" · Recipient distribution (25% Version A · 25% Version B · **50% receive winner**) · Winning metric (Highest open rate) · Test length [24] hours · Fallback version. Nút `Create test`. Sau đó tên email đổi thành "(A) Birthday" và có `Version A ▾`.
- **Automate**: "Automate what happens after your email is sent" + `+ Add new simple workflow`. Khung lưu ý xanh "Any changes you make to a live simple workflow will be published at once…". Workflow nhỏ dạng dọc: trigger **"When a contact clicks a link in the email"** → "1. Add to static list" → "End"; toggle `ON ✓` + `Actions ▾`. Cuối: "Need more powerful workflows? … **workflows tool**".
- **Review and schedule**: panel phải tổng hợp **chỉ đọc**: From address · Subject line · Who has access · Preview text · **Send to** (link list) · **Don't send to** · Don't send to unengaged contacts (Off) · **Total recipients 2** · **Send time "8/6/2025 11:00 AM (Indochina Time - UTC+07:00)" + "Email will be sent to all contacts at the same time, whatever time zone they are in."** · Automation: Workflows (1) trạng thái On. Đáy: `Schedule` · `Preview` · `Cancel`.
- **Sau khi lên lịch**: trang email có `‹ Back to all emails`, tên, chấm cam **"Scheduled | Regular A/B email"**, `Email version: A/B Overview ▾` · `List name: All ▾` · `See details`; tab **Performance · Recipients · Test results**; "Bot filtering is currently ON". Thân trang: minh hoạ đồng hồ cát + **"Email scheduled"** + câu nêu ngày giờ và list sẽ nhận + `Edit scheduled email` / `Cancel scheduled email`.

#### H9. Marketing email: danh sách và báo cáo
[Marketing email](https://mobbin.com/flows/9ce1a574-3063-4acd-b1a2-e2846d3eeaf9)

- Trang **Marketing Email** có 3 tab: **Manage · Analyze · Health**. Nút `Compare emails`, `Email tools ▾`, `Create email`.
- **Manage**: tab view theo trạng thái có chấm màu: All emails · **Drafts** (xám) · **Scheduled** (cam) · **Sent** (xanh) · Archived; `+ Add view (5/50)`. Lọc: Campaigns, Email types, Users and teams, Subscriptions, + More, Advanced filters. Cột: Email name (chấm trạng thái) · **Delivered · Open rate · Click rate** · Last updated at (GMT+7). Có `Edit columns`, `Export emails`.
- **Analyze**: lọc Campaign / Email type / Date range (từ–đến). Thẻ **Recipient engagement**: chip "FROM 7/21/2025 TO 8/20/2025" + **"COMPARED TO | PREVIOUS 31 DAYS"**; số lớn SENT 8 (dưới: "4 Emails"), OPEN RATE, CLICK RATE, CLICK-THROUGH RATE, REPLY RATE, mỗi số có dòng đếm tuyệt đối bên dưới ("0 Opened"). Thẻ **Delivery**: DELIVERED RATE 100% ("8 Delivered"), HARD BOUNCE RATE, UNSUBSCRIBED RATE, SPAM REPORT RATE, mỗi nhãn có ⓘ. Link "How the % change is calculated", `Export charts`.
- **Health**: menu trái Summary / Score over time / Metrics (Opens, Click-throughs, Hard bounces, Unsubscribes). Biểu đồ "Score over time" 12 tháng (Your score vs Emails sent). Bảng theo tháng: Health score (**"Not enough data"**) · Opens · Click-throughs · Hard bounces · Unsubscribes · Emails sent ("Under 400").

#### H10. Sequences
[Creating a sequence](https://mobbin.com/flows/cb44e296-6370-41e1-ab6c-89d2bd25ba66) (11 màn) · [Sequences](https://mobbin.com/flows/addd6e09-6f5f-47d3-8065-b6e2d2afd05f)

- **Trống**: "Create a Sequence to connect with leads and customers at scale" + 3 lợi ích có mũi tên + `Create a sequence`; bên phải minh hoạ chuỗi email → gọi → LinkedIn → lịch.
- **Danh sách**: tab **Manage · Analyze · Automate · Scheduled**; **"1 of 5,000 created"** (hạn mức) cạnh `Actions ▾` · `Create sequence ▾`. Banner "Send sequences without leaving your inbox" (extension Gmail/Outlook). Bảng: Name · **Total enrolled · Reply rate · Meeting rate** · Owner · Date modified; `New folder`.
- **Trình sửa sequence**: thanh trên `‹ Back` · tên ✎ · **Owner: Sam Lee** · `Save`; tab **Steps · Settings · Automate**.
  - Dải tổng quan: **TOTAL STEPS 6 · DAYS TO COMPLETE 12 · AUTOMATION 33% · UNENROLL CRITERIA 2** (số cuối là link).
  - Mỗi bước là thẻ: icon tròn theo loại · "1. Automated Email - Day 1" · tên phiên bản · subject + đoạn đầu với **biến dạng chip màu** ("Contact: First Name", "**Placeholder: CONFERENCE NAME**" đỏ) · `See more` · `+ Add A/B test` · ⋯. Giữa các bước: **"Delay: None"** sửa được + `+`. Bước task có badge **`PAUSES SEQUENCE`**.
  - Lưu: panel phải "Save and manage sharing": Sequence name · "Who can see this sequence?" Private / Everyone / Specific users or teams.
- **Step performance** (Analyze): mỗi hàng là một bước (Step 1 Automated email, Step 2 Todo task, Step 4 Call task, Step 5 Manual email…), cột số liệu đổi theo loại bước (Sent/Opens/Clicks/Replies cho email; Created/Calls made/Connected/Completed cho task), toggle **`Rates` / `Counts`**. Bên dưới: "Performance over time" (Booked meetings ▾, Frequency: Weekly ▾), trống: "There is no data to show in this time frame. Try changing the date range."
- **Automate**: 2 thẻ "Form submission" và "Page view" (tự enroll khi lead gửi form / xem trang) + `Create automation`.

#### H11. Onboarding và User guide
[Onboarding](https://mobbin.com/flows/3d4cc50d-7802-4b4b-95ac-0ac414b2a06d) (29 màn) · [Joining a workspace](https://mobbin.com/flows/16367478-e464-4d1c-bd26-f2473a3166f3) · [User guides](https://mobbin.com/flows/c9576989-5c2f-47fb-b80c-2ffae8bb0592)

- Đăng ký từng câu một màn, có **thanh tiến độ mảnh trên đỉnh trang**: "Create your password" (4 điều kiện dạng radio tick dần) → "What is your company's name?" → …
- **"Tailor your experience"**: cột trái chữ lớn + "About 3 minutes" + stepper dọc (Business challenges ✓ · Workflows & tools · Add contacts · Invite users); phải là câu hỏi "2 of 4 · What tools do you use?"; đáy `Skip, for now` · `Next`.
- Mời vào team: modal "Join your team in HubSpot!" (Google / Microsoft / Apple / email) đè lên trang User Guide mờ phía sau.
- **Tour theo tính năng**: lần đầu vào Marketing Email hiện modal "Hi Sam 👋 We'll show you around **Marketing Emails**…" + `Get started`.
- **User Guides** (trang riêng): menu trái theo hub (Marketing / Sales / Customer Service / Content / Commerce Guide) + `View your plan` · `Invite your team` · **"Ready to connect:"** icon Gmail, Outlook, Google Meet, `+`. Phải: banner "2 invited teammates haven't set up their accounts yet · `Review invites`", **"Your Marketing tools progress 73%"**, nhóm việc ("Recommended: All you need to get started" → *Set up the basics* "Import your contacts, invite teammates…") mỗi việc có **thanh % riêng + "About 4 minutes left"**, `Show completed (2)`. Cuối trang: "Finished setting up? **Turn off the user guide**, and we won't show you this page again."

#### H12. Settings, hạn mức và tài khoản
[Settings](https://mobbin.com/flows/8bf3c275-71e0-410e-abb9-4f918ac53cde) · [Account & billing](https://mobbin.com/flows/f5128fd9-062a-475e-9c2b-c892d04acfb1) · [Limits](https://mobbin.com/flows/33ee8d7b-316b-4098-8e59-a4ab3ee8376c)

- **Settings** là trang riêng: `‹ Back`, tiêu đề + 🔍 tìm, sidebar phụ chia **Your Preferences** (General, Notifications) và **Account Management** (Account Defaults, Audit Log, Users & Teams, Integrations ▾, Tracking & Analytics ▾, Privacy & Consent, Security, Brand Identity `BETA`, Approvals, Routing, AI, Payments Account `NEW`…) rồi **Data Management**.
- General có tab ngang Profile · Email · Calling · Calendar · Tasks · Security · Automation; câu phân biệt "These preferences will only be applied to you. For account security settings please go to account settings."
- **Users & Teams**: tab Users · Seats · Teams · Presets; **dải 6 số** RECENT USERS · INACTIVE USERS (`Review users`) · DEACTIVATED · PENDING INVITE 2 (`Resend invites`) · INVITE BOUNCED · USERS ENROLLED IN 2FA; bảng Name · Seat · Access ("Contacts | Reports | Marketing", "Super Admin").
- **Account & Billing › Usage & Limits**: "Your Credits" (0 credits a month, `Add credits`), "Usage this month | Aug 1, 2025 – Aug 31, 2025", "Credits reset monthly", `Refresh` + "Updated 5:12 AM", "Manage credit use by feature". Tab Delete Account: một thẻ + nút đỏ `Delete account`.
- **Data Model › Limits**: mỗi loại đối tượng một hàng "6 of 15,000,000" + thanh + "0% Used".

#### H13. Social
[Social](https://mobbin.com/flows/8ba46057-5bac-4c7a-9dd7-9fdadd63b6a2) (12 màn) · [Creating a social post](https://mobbin.com/flows/7fabb9a8-febe-4c5c-b593-30432efa4086) (11 màn)

- Trang Social: tab **Manage · Reply `BETA` · Listen · Analyze**; nút `Compare social posts` · **`Schedule in bulk`** · `Create social posts`.
- Manage: toggle **List / Calendar**; cột trái trạng thái có chấm màu + số (Published · Scheduled 0 · Unsuccessful 0 · Pending 1 · Drafts 0); lọc Users and teams, Accounts, Published from, Date range, Campaign, Created by; `Manage columns`, `Export posts`. Cột: bài · Published time · Clicks · Interactions · Published from · Campaign.
- **Soạn bài** toàn màn: trái "Select accounts" (chip tài khoản) → "Create your posts" có tab **Draft + tab theo từng mạng (X)** → mỗi tài khoản một khối (`+ Duplicate post`, 🗑), ô nội dung có `# Hashtags`, emoji, đính kèm, **✦ AI ▾**, **bộ đếm ký tự "280"** theo mạng · Add media · "X first reply" · Publishing options (Publish now / Schedule for later + ngày giờ GMT+7) · Add to marketing campaign. Phải: **preview giống bài thật trên X** + "Previews may display differently when posted." Nút `Save draft` · `Review & Publish`.
- Đăng xong: toast trên đỉnh "**Signed, sealed, and delivered.** Your post is being published."
- Reply (trống): "One home to manage all your social media" + 4 lợi ích + `Connect accounts`. Analyze: "Top posts" (Interactions, Clicks, Impressions, Shares).

### 4.3 Danh mục pattern

| # | Pattern | HubSpot dùng ở | Đánh giá cho Saella |
|---|---|---|---|
| H-P1 | Mẫu trang danh sách thống nhất: tiêu đề + số bản ghi → tab view → lọc nhanh → tìm/Export/Edit columns → bảng → phân trang | Contacts, Lists, Email, Social, Products | **Nên học**. Một khuôn cho Contacts, Companies, Campaign, Templates |
| H-P2 | View đã lưu là tab ngang, có `×`, `+ Add view (n/max)`, nút lưu view sáng lên khi view bị đổi | Contacts, Lists, Email | **Nên học** |
| H-P3 | Lọc nhanh dạng dropdown chữ + `Clear all`; lọc nâng cao trong panel phải với nhóm AND/OR | Contacts | **Nên học**. Lọc nhanh cho việc hằng ngày, nhóm AND/OR cho segment |
| H-P4 | Edit columns: chọn bên trái, kéo-thả thứ tự bên phải, cố định cột (Frozen columns) | Contacts | **Nên học** |
| H-P5 | Sửa ô ngay trong bảng + toast "changes saved · Undo" | Contacts | Nên học. Hợp với nguyên tắc có thể hoàn tác |
| H-P6 | Thanh thao tác hàng loạt thay tiêu đề bảng, có icon + chữ, mục không dùng được thì xám | Contacts | **Nên học**. Rõ hơn thanh chỉ có icon của Apollo |
| H-P7 | Kết quả thao tác có link tới đối tượng vừa tạo ("added to the new list: New Contacts ↗") | Add to list | Nên học |
| H-P8 | Xem nhanh hồ sơ ở panel phải, các khối thu gọn, nút hành động tròn có nhãn | Preview a contact | **Nên học** |
| H-P9 | Hồ sơ 3 cột: thuộc tính trái · Overview/Activities/Intelligence giữa · liên kết + AI phải | Contact detail | **Nên học** cho hồ sơ contact và công ty |
| H-P10 | Dòng thời gian hoạt động: tab con theo loại, nhóm theo tháng, thẻ mở/thu, ô tìm, `Collapse all` | Contact › Activities | **Nên học**. Dùng cho lịch sử gửi/mở/trả lời của contact |
| H-P11 | Tóm tắt AI trên hồ sơ có ngày tạo + nút làm mới + 👍👎 + `Ask a question` | Breeze record summary | **Nên học** cho agent |
| H-P12 | Panel AI đẩy nội dung (không đè), màn chào có 3 gợi ý theo động từ (Summarize / Draft / Prepare), "Reasoned for N seconds", hỏi lại cuối câu trả lời | Breeze Copilot | Nên học cho panel Agent |
| H-P13 | AI gắn tại ô cần viết (`+ Generate` trong ô Subject, Preview text, bài social) | Inbox tab, Social | **Nên học**. Write with AI đúng chỗ |
| H-P14 | Câu trả lời của agent có mục **Sources** | Customer Agent preview | Tham khảo |
| H-P15 | Wizard import 4 bước có stepper; Mapping Guide nêu trường bắt buộc; "0 errors found, of N rows scanned"; cột Preview information; đếm cột chưa map | Import | **Nên học** |
| H-P16 | Checkbox cam kết nguồn dữ liệu (không mua/thuê list) trước khi import | Import › Details | **Nên học**. Hợp với deliverability của Saella |
| H-P17 | Trang kết quả import: New / Updated / Associations / Errors + lịch sử Past imports có Error count | Import | **Nên học** |
| H-P18 | Trình tạo list: cột lọc trái + xem trước kết quả phải + "Estimated size" | Creating a list | **Nên học** cho chọn người nhận batch |
| H-P19 | List có Type Static/Active, cột "Used in (count)", tab Unused lists / Recently deleted, Exclusions | Lists | Nên học |
| H-P20 | Trình soạn email chia tab theo bước (Edit · Inbox · Send to · Schedule · Setup · Automate) + Autosaved | Marketing email | **Nên học** cho luồng tạo campaign |
| H-P21 | Send to: Send to / Don't send to + bỏ người không tương tác + **Estimated recipients "2 out of 3" + review reasons** | Send to | **Nên học**. Đúng chỗ Saella cần (batch ≤ 5.000) |
| H-P22 | Panel "Review and schedule" tổng hợp chỉ đọc trước khi bấm gửi, có múi giờ và câu giải thích | Review and schedule | **Nên học**. Khớp nguyên tắc chờ duyệt của agent |
| H-P23 | Trạng thái "Email scheduled" có `Edit scheduled email` / `Cancel scheduled email` | Email detail | Nên học |
| H-P24 | A/B test: % test, chia A/B/winner, chỉ số thắng, thời gian test, bản dự phòng | A/B test | Tham khảo. Cần đối chiếu PRD |
| H-P25 | Workflow nhỏ gắn ngay vào email ("When a contact clicks a link" → Add to list) | Automate tab | Tham khảo cho follow-up tự động |
| H-P26 | Biến cá nhân hoá hiện thành chip; biến chưa điền (Placeholder) tô đỏ | Email editor, Sequence | **Nên học** |
| H-P27 | KPI có chip khoảng ngày + "Compared to previous 31 days" + số tuyệt đối dưới tỉ lệ | Analyze | **Nên học** cho Overview |
| H-P28 | Tab Health: điểm sức khoẻ gửi theo tháng, "Not enough data" khi ít mẫu | Marketing Email › Health | **Nên học** cho Sending/domain |
| H-P29 | Dải tổng quan sequence (Total steps, Days to complete, Automation %, Unenroll criteria) | Sequence editor | **Nên học** cho follow-up |
| H-P30 | Hiệu suất từng bước, cột đổi theo loại bước, toggle Rates / Counts | Sequence › Step performance | **Nên học** |
| H-P31 | Hạn mức hiển thị ngay cạnh nút tạo ("1 of 5,000 created", "4 of 1,000 contacts") | Sequences, Import, Limits | Nên học. Saella có giới hạn 5.000/batch |
| H-P32 | Onboarding một câu một màn + stepper dọc + "About 3 minutes" + `Skip, for now` | Tailor your experience | Nên học |
| H-P33 | User guide có % tiến độ, thời gian còn lại mỗi việc, `Show completed`, `Turn off the user guide` | User guides | **Nên học** |
| H-P34 | Settings riêng: tìm kiếm, chia Your Preferences / Account Management, dải số người dùng | Settings | Nên học |
| H-P35 | Soạn social: tab theo mạng, bộ đếm ký tự theo mạng, preview như bài thật, List/Calendar | Social | **Nên học** cho đăng mạng xã hội hợp nhất |
| H-P36 | Header modal/panel tô gradient teal | Toàn app | Không hợp. Saella giữ nền phẳng theo token |

### 4.4 Chức năng đáng cân nhắc cho Saella

Chỉ là ý tưởng; muốn làm phải đối chiếu PRD và hỏi team.

1. **Don't send to + bỏ người không tương tác** khi chọn người nhận batch, kèm số "X out of Y" và lý do bị loại.
2. **Cam kết nguồn dữ liệu khi import** (không phải list mua/thuê).
3. **Health score gửi email theo tháng** trên màn Sending/domain.
4. **Tóm tắt AI trên hồ sơ contact/công ty**, có ngày tạo và nút làm mới.
5. **Exclusions cho list**: loại cả list hoặc từng người khỏi segment.
6. **Lists "Used in"**: biết list đang dùng ở campaign nào trước khi xoá.
7. **Hành động sau khi gửi** gắn ngay vào campaign (click link → thêm vào list / follow-up).
8. **Hiệu suất theo từng bước follow-up** với toggle tỉ lệ / số đếm.
9. **Lịch đăng social dạng Calendar** và "Schedule in bulk".
10. **Tắt hướng dẫn onboarding** khi người dùng đã xong.

### 4.5 Không nên học

- **Rail chỉ icon + menu nổi khi rê**: phải rê mới biết mục; người không làm sales khó tìm. Saella giữ sidebar có chữ.
- **Quá nhiều đối tượng**: Tickets, Deals, Products, Payments, Subscriptions xuất hiện khắp hồ sơ contact với thẻ trống "No associated objects…". Saella chỉ có contact và công ty.
- **Banner trial chiếm một hàng trên cùng** mọi trang, cộng nút Upgrade, ổ khoá trên nút thao tác (Enrich records, Enroll in sequence, Use AI to create filters). Loãng sự chú ý.
- **Trình soạn kéo-thả nhiều module** (Ecommerce, Cart, Payments, Pattern nền): Saella là outreach B2B, email gần thư thường; không cần trình dựng như newsletter.
- **"Send time… sent to all contacts at the same time, whatever time zone they are in"**: với 7 nước ĐNÁ, nên cân nhắc gửi theo giờ địa phương thay vì cùng lúc.
- **Hai trợ lý AI khác nhau** (Breeze Copilot và Support Assistant) cùng hiện ở góc phải: dễ lẫn. Saella chỉ một agent.
- Màu nhấn nhiều: cam cho nút chính, teal cho link và header, hồng cho AI, xanh tím cho banner.

### 4.6 Gợi ý áp vào màn Saella hiện có

| Màn Saella | Lấy từ HubSpot |
|---|---|
| Overview | H-P27 (KPI có khoảng ngày + so kỳ trước + số tuyệt đối), H-P33 (checklist % khi mới dùng) |
| Campaign / gửi batch | H-P20, H-P21, H-P22, H-P23, H-P31; ý tưởng 1, 7 |
| Follow-up | H-P29, H-P30, H-P25; ý tưởng 8 |
| Template + Write with AI | H-P13, H-P26; chọn template có nhóm + số đếm + "Start from scratch" |
| Bảng recipients của template | H-P1, H-P2, H-P6, H-P21 (lý do bị loại) |
| Contacts | H-P1–H-P10, H-P15–H-P19; ý tưởng 2, 4, 5, 6 |
| Companies | H-P1–H-P4, H-P8, H-P9 (chưa thấy trang công ty trên Mobbin, chỉ suy từ hồ sơ contact) |
| Settings (Sending/domain) | H-P28, H-P34; ý tưởng 3 |
| Onboarding | H-P32, H-P33; ý tưởng 10 |
| Agent | H-P11, H-P12, H-P14 |
| Social | H-P35; ý tưởng 9 |

---

## 5. Unify (web)

> Mobbin không có Lemlist (đã tìm 3 lần ngày 2026-10-29), nên mục này phân tích Unify, cùng nhóm chuỗi follow-up.

### 5.0 Nguồn và giới hạn

- Ảnh từ Mobbin, app "Unify" bản web (unifygtm.com), quét ngày 2026-10-29. Ngày thấy trong ảnh: list tạo "8/5/26", "8/10/26"; Outbox hẹn gửi "8/7"; "Free trial ends Aug 18, 2026". Vậy ảnh chụp khoảng **8/2026**, một đợt.
- Tên "Unify" trơn trả về app khác (Toggl Track, Uniswap). Phải ghép ngữ cảnh ("Unify sequence", "Unify leads"…) mới ra.
- Xem được **5 flow** của Unify: Editing a sequence (8 màn), Adding to sequence (3), Leads (8), Starting a chat (12), Settings (10). Thêm 3 màn lẻ qua `search_screens`: tab Steps, tab Outbox, panel "Add a step". Preview chỉ hiện một phần màn của mỗi flow.
- Đã quét: sequence, leads, onboarding, chat/agent, insights/analytics, mailbox/settings, tasks, enrollment, outbox/replies, hồ sơ người.
- **Mobbin thiếu** (tìm không ra, không mô tả): trang **Insights**, trang **Tasks**, nội dung tab **Replies**, tab **Settings của sequence** (lịch gửi, điều kiện thoát), dropdown **Version** mở ra, **hồ sơ người/công ty**, màn **đăng ký/onboarding** trước Home, **xác thực domain** (DKIM/SPF/DMARC), **hộp thư phản hồi** gom chung, trang Usage, Dialer, AI research.
- Unify bán cho đội GTM có SDR (gọi điện, task LinkedIn, đồng bộ Salesforce/HubSpot). Phần gọi điện và LinkedIn ngoài PRD Saella, chỉ ghi ngắn.

### 5.1 Khung app (IA)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ▣ Chat ▾      Home  Tasks  Leads  Sequences  Insights  ☆   ◔ ⏱ 🔔 AS │
├──────────────┬───────────────────────────────────────────────────────┤
│ ▤  + New chat│        Afternoon, Alex.                               │
│ ⏱ Scheduled  │        Who are we prospecting today?                  │
│   chats      │  ┌─────────────────────────────────────────────┐      │
│ Recents      │  │ Prospect, engage, @ to add context          │      │
│  Companies…● │  │ 📎                         GPT 5.4 ▾   ↑    │      │
│  Persona…    │  └─────────────────────────────────────────────┘      │
│  Unify… Demo │  Set up an integration   Salesforce  HubSpot  ×       │
│  Welcome…    │  [ gợi ý 1 ] [ gợi ý 2 ] [ gợi ý 3 ]                  │
│              │  Personalized with research about your company        │
└──────────────┴───────────────────────────────────────────────────────┘
```

- **Không có sidebar điều hướng**. Menu chính là thanh ngang giữa top bar: Home · Tasks · Leads · Sequences · Insights · ☆ (ghim).
- **Home chính là màn chat với agent**. Sidebar trái của Home chỉ chứa lịch sử chat: `New chat`, `Scheduled chats`, `Recents` (chấm cam ở chat có cập nhật, badge `Demo` ở chat mẫu).
- Ở các màn khác, góc trái có nút `Chat ▾` để quay về chat.
- Góc phải: một icon tròn dạng đồng hồ đo (có vẻ là hạn mức credit, chưa thấy mở), icon lịch sử, chuông, avatar.
- Account menu: email + "Pro plan · 1 member", `Theme ▸ System`, `Settings`, `Logout`.
- **Settings** là trang riêng, sidebar phụ chia nhóm: Personal settings (Profile, Notifications) · Workspace (General, Users, Usage, Plans & billing) · Integrations · Features (Sequences, Tasks, Dialer, AI research) · **Deliverability (Mailboxes)**.
- Màu: nền kem rất nhạt, chữ đen, **nút chính màu đen** (`New Sequence`, `Publish`, `Add to Sequence`, `New mailbox`). Màu cam chỉ ở logo, chấm báo, thanh credit. Nhãn `Agentic` xanh dương nhạt có icon ✦. Tiêu đề lời chào dùng font serif.

### 5.2 Flow

#### U1. Chat với agent để tìm lead (Home)
[Starting a chat](https://mobbin.com/flows/eeff6033-f743-4da6-863c-d5a222046101) (12 màn)

- **Màn trống**: lời chào "Afternoon, Alex. Who are we prospecting today?"; ô nhập "Prospect, engage, @ to add context" có đính kèm và **chọn model** (`GPT 5.4 ▾`, có bản `GPT 5.6 Sol`); dải "Set up an integration" với Salesforce / HubSpot (đóng được); 3 câu gợi ý ("Find companies redesigning product or marketing experiences right now", "Build me a founder-ready account brief and outreach pack for one target"…); dòng "Personalized with research about your company".
- **Agent hỏi lại trước khi làm**: hiện trạng thái "Waiting for your answer 8s", dòng bước "Narrowing target criteria" kèm giải thích ngắn ("I'll lock the search to the right motion first so I do not waste time or credits."), "Asking for clarification…".
- **Thẻ câu hỏi nhiều bước** đè lên ô nhập: "1 / 4 Which redesign motion should I prioritize?"; mỗi lựa chọn có tên in đậm + một dòng mô tả + **phím số 1–4**; lựa chọn đầu ghi `(Recommended)`; dòng cuối là ô tự gõ; đáy `Previous` · `Skip` · `Next ↵`; nút thu nhỏ thẻ.
- **Kết quả**: agent viết lại cách hiểu yêu cầu, nói **độ tin cậy** ("Confidence is moderate: high that these companies are investing…, lower that every one is in an explicit redesign cycle"), chip bảng "Companies actively hiring product design talent", icon copy / 👍 / 👎, rồi **3 gợi ý bước tiếp** có mũi tên ↳ ("Filter the list to B2B SaaS only…", "Enrich the top 10 companies with headcount, funding, and recent news signals", "Find Head of Product Design… contacts at these 25 accounts").
- **Bảng kết quả mở ở panel phải**, chat vẫn ở trái: tên bảng + "25 Records", icon lưu / tải về, nút đen **`Add to Sequence`**, ô "Search table"; cột Company (logo) · Domain · LinkedIn URL · Company Description…; nút nổi `More columns ›`.

#### U2. Agent dựng sequence và soạn nháp, người dùng duyệt từng thư
[Adding to sequence](https://mobbin.com/flows/5c14c4dc-9b1f-4947-92b6-20e224eaa9a1) (3 màn) · cuối flow [Starting a chat](https://mobbin.com/flows/eeff6033-f743-4da6-863c-d5a222046101)

- Người dùng gõ "Help me enroll [chip bảng] into a personalized sequence." Agent hiện "Scoping the sequence", rồi hỏi "1 / 4 Which buyer should I target at each company?" (Head of Product Design `(Recommended)`, Senior Product Designer, Design Ops / Systems, VP Product, Other).
- Xong: "Thought for 5m 11s". Agent báo đã làm gì **và đã bỏ qua gì**: "I created a 1-step personalized sequence and drafted 6 enrollments from the first 10 companies… I skipped 4 accounts where the best contact was not a strong… match… **Nothing is sending yet. These are reviewable drafts waiting for your approval.**" Thẻ sequence "Mobbin | Product design hiring scout · `6 drafts`".
- **Panel duyệt** bên phải: đầu panel tên sequence + "1 step | 1 day" + `Edit template`.
  - Cột **Enrollment queue (6)**: danh sách người (avatar, tên, chức danh), mỗi người một nút tròn để đánh dấu.
  - Bên phải: thư nháp của người đang chọn: "Step 1 · Automatic Email · Day 1", From / To / Subject, thân thư đã cá nhân hoá theo công ty.
  - Đáy: `Mark all as ready`, `Enroll ready (0)`; thanh nổi: 🗑 · **`Enroll now ⌘↵`** · **`Mark ready R`** (phím tắt ngay trên nút).
- 3 gợi ý tiếp: tạo sequence 3 bước có "one follow-up and one breakup email", enrich số điện thoại và xác minh email, tạo nháp cho 4 công ty còn lại.

#### U3. Danh sách sequence
[Editing a sequence](https://mobbin.com/flows/98b52261-793f-4097-bda1-765b84b03b17) (màn đầu)

- Header "Sequences | 4 Sequences", icon thư mục, nút đen `+ New Sequence`. Lọc nhanh: `Starred` · `● Active` · `Owner ▾`; ô Search; `Sort: Created at`.
- **Mỗi sequence là một hàng thẻ**: tên + nhãn `✦ Agentic` + chấm xanh (đang chạy) hoặc nhãn `Draft`; dòng phụ "3 steps · 11 days" + "Default schedule"; dải số: **Total enrollments · In progress · Finished · Reply rate · Positive · Positive + Objection · Open rate · Click rate**; ☆ và ⋮ ở cuối. Sequence chưa có dữ liệu hiện "-" và "- steps · - days".

#### U4. Trang một sequence: số liệu + bảng Enrollments
[Editing a sequence](https://mobbin.com/flows/98b52261-793f-4097-bda1-765b84b03b17) · tab Steps: [màn](https://mobbin.com/screens/5ce6f381-157e-4e8b-95c2-47e2356eb56e) · tab Outbox: [màn](https://mobbin.com/screens/421d367b-cb5f-4a25-817f-458cea21e1bd)

- Header: tên + `✦ Agentic` + ☆; "3 steps · 11 days · Default schedule". Phải: badge `Active` + toggle bật/tắt, `Edit`, ⋮.
- Lọc toàn trang: `Assignees ▾` · `Mailboxes ▾`; góc phải **`Version ▾`** (lọc số liệu theo phiên bản sequence).
- **Ô số liệu trả lời**: `Reply rate` kèm **hai ô con lồng bên trong**: `Positive` và `Positive + Objection` (mỗi ô "0.0% of replies"); bên cạnh `Open rate`, `Click rate`, `Opt-out rate`. Mỗi ô có ⓘ, số lớn, dòng "0 people". Chưa có dữ liệu thì hiện "--".
- **Enrollment metrics**: `Total enrollments 3 People` · `In progress 3 · 100.0% of Total` lồng ô con `Queued 3 · 100.0% of In progress` · `Finished 0 · 0.0% of Total`. % luôn ghi rõ "of" cái gì.
- Tab **Enrollments · Steps · Outbox · Replies**.
  - **Enrollments**: lọc `Step ▾` `Status ▾` + Search + nút tải về. Cột: **Person** (logo công ty, tên, "chức danh · công ty") · **Status** (badge `Queued`) · Company · **Enrolled** ("7 minutes ago" / "By Alex Smith") · **Mailbox** (hộp gửi) · **Current step** ("Step 1" / "Automatic Email") · **Version** (`V1`). Cột Person ghim trái.
  - **Steps**: mỗi bước một thẻ: "Step 1 · Automatic Email · Day 1", nút `Show prompt` (xem prompt AI sinh thư), dải trạng thái **Scheduled · Finished · Paused · Blocked · Error**; dòng thứ hai **Delivered · % Replied · % Opened · % Clicked · % Opt-out · Bounced · Bounce Stopped**; dưới là Subject và thân thư mẫu. Giữa hai thẻ: "⌛ 4 Days".
  - **Outbox**: tab con `Scheduled` / `Sent`; ô "Search by Person or Company"; cột Person · Step · Email (tiêu đề đậm + đoạn đầu, mỗi người một tiêu đề khác) · Scheduled ("🕐 8/7 at 11:00 PM").
  - **Replies**: Mobbin không có màn mở tab này.

#### U5. Sửa sequence: bản nháp, publish, version
[Editing a sequence](https://mobbin.com/flows/98b52261-793f-4097-bda1-765b84b03b17) (8 màn) · panel Add a step: [màn](https://mobbin.com/screens/57f9581e-2ec0-41a3-a62e-12cab7ac891e)

- Header editor: ← · tên ✎ · `✦ Agentic` · badge `Draft`; phải: trạng thái "Saving" (tự lưu) + nút đen **`Publish`** (mờ khi không có thay đổi). Tab `Editor` / `Settings`.
- Dải tóm tắt giữa header: **Total steps 4 · Days to complete 13 · Automation 75%** (tỉ lệ bước tự động; thêm bước gọi điện thì tụt từ 100% xuống 75%).
- **Banner bản nháp**: "This Sequence has unpublished changes" + `Discard draft` + `See published version`. Sequence đang chạy không bị đổi tới khi bấm Publish.
- **Canvas dọc** bên phải: thẻ bước ("Day 5 · Step 2 · Automatic Email" + 🗑), dưới thẻ một dòng "↩ ✦ Re: Write a short internal-feeling subject…" (thư trả lời trong cùng thread, tiêu đề do AI viết theo prompt); giữa các thẻ là **node chờ riêng** "⌛ Wait 4 Days 🗑"; nút `+` tròn giữa mọi node để chèn.
- **Panel trái "Add a step"**: "Add an automatic/manual action or a time delay". Lựa chọn: `Add a delay` · `Automatic email` · `Manual email` (Create a task to send an email) · `Phone call` · `Action item` · `Reminder: View LinkedIn profile` · `Reminder: Send LinkedIn connection request`. Mỗi lựa chọn có icon + một dòng mô tả.
- **Panel trái khi sửa bước Phone call**: Priority `Medium ▾`, Due date `Due 4 hours later ▾`, Assign to (`Plays` / `Manual` → Mailbox owner), "Call note prompt: Compose the prompt and we'll personalize each task note using prospect, account, and Sequence context", nhãn `✦ AI Personalized`, ô soạn prompt có toolbar định dạng.
- Không thấy điều kiện rẽ nhánh (if/else) trong canvas. Chuỗi là tuyến tính: bước → chờ → bước.

#### U6. Leads: People và Lists
[Leads](https://mobbin.com/flows/e8f12df8-b187-44b4-b81a-c50ace672c72) (8 màn)

- **People** ("People | 9 People"): Search, **`Sort: Last Website Activity`**, `Columns`. Cột: Name (avatar + email dưới tên) · **Last Web Activity** · Title · Status · **Last Sales Activity** · Record Owner · Lead Source · Company. Cột Name ghim trái.
- **Lists** ("Lists | 2 Lists"): `Starred`, `Owner ▾`, Search, `Sort: Created at`, nút đen `+ New List`. Mỗi list một thẻ: icon toà nhà, tên, "Created by Alex Smith on 8/10/26 · 0 Companies", ☆, ⋮. List do agent tạo từ chat (U1) cũng nằm ở đây.
- Settings › General có mục **Fields** chọn cột hiển thị cho Companies/People, trong đó có **Intent Trend (L30D)** và **Intent Level (L30D)**: tín hiệu ý định 30 ngày gần nhất. Không thấy màn hiển thị tín hiệu này.

#### U7. Settings: mailbox, credit, trường tuỳ chỉnh
[Settings](https://mobbin.com/flows/012c75e1-ca53-4ba4-a703-81bf201757ea) (10 màn)

- **General**: Workspace name, Workspace domain, `Update`. **Custom user fields**: "These will appear on the User Profile Setting pages and can be used as sequence variables" + `Create new`. **Fields**: chọn trường hiển thị cho Companies và People.
- **Plans & billing**: dải "Free trial ends Aug 18, 2026"; Current plan `Pro` `Trial`, "$0 / month", "1 seats × $0 / seat"; **Plan credits · all seats** thanh tiến độ cam "385 / 500 used", "Ends Aug 18, 2026", link `Breakdown by seat →`; **Extra credit balance** `Shared` + `Redeem code` + `Upgrade plan`; `Add user`; bảng Invoice history trống "No invoices yet."
- **Mailboxes** ("1 mailbox"): `Docs`, `New group`, nút đen `+ New mailbox`. Banner vàng upsell "Talk to sales to boost your deliverability: Add more mailboxes and unlock managed mailboxes, managed deliverability, and higher send limits with Business plans" + `Talk to Sales` / `Learn More` (đóng được). Tab `Mailboxes` / `Groups`. Lọc `Sort: Mailbox Name`, `User ▾`, `Mailbox group ▾`. Cột: Mailbox (icon Gmail + chấm xanh trạng thái) · **Current Daily Send Limit ⓘ "50 / 50"** · Assigned User · Mailbox Groups.
- Không thấy màn DNS / DKIM / SPF / DMARC.

#### U8. Onboarding: Guided Setup trong chat
[Starting a chat](https://mobbin.com/flows/eeff6033-f743-4da6-863c-d5a222046101) (màn "Welcome to Unify")

- Chat đầu tiên "Welcome to Unify" có sẵn 3 thẻ việc mẫu, mỗi thẻ có ảnh bảng thu nhỏ + nút đen: "See what Unify can do: Open a guided demo… using sample data" `Start demo →`; "Find design leaders at hiring app teams" `Let's go →`; "Find and sequence product leaders at recently launched app teams" `Let's go →`. Thẻ đã **cá nhân hoá theo công ty người dùng** (nhắc tên công ty họ).
- Panel phải **Guided Setup**: "Get the most from Unify as you prepare to start enrolling prospects and sending emails." 5 thẻ: Explore Unify · Find Prospects · Send Emails · Invite Your Team · Connect a Mailbox (đã xong: mờ + ✓ xanh). Mỗi thẻ có icon, tên, một dòng mô tả, mũi tên ›.
- Không thấy màn đăng ký hay câu hỏi vai trò trước Home.

### 5.3 Danh mục pattern

| # | Pattern | Unify dùng ở | Đánh giá cho Saella |
|---|---|---|---|
| U-P1 | Agent làm xong thì để **nháp chờ duyệt**, nói rõ "Nothing is sending yet" | Chat › dựng sequence | **Nên học**. Đúng nguyên tắc "mọi thao tác ghi chờ duyệt" của Saella |
| U-P2 | Hàng đợi duyệt: danh sách người trái, thư nháp phải, `Mark ready` / `Enroll ready (n)` / `Enroll now`, phím tắt in trên nút | Panel Enrollment queue | **Nên học**. Áp cho duyệt batch do agent soạn |
| U-P3 | Agent hỏi lại bằng thẻ nhiều bước "1 / 4", lựa chọn có mô tả, có `(Recommended)`, phím số, ô Other, `Skip` | Chat | **Nên học** cho trang Agent |
| U-P4 | Agent báo độ tin cậy và những gì đã bỏ qua ("I skipped 4 accounts…") | Chat | **Nên học**. Minh bạch, dễ kiểm |
| U-P5 | Kết quả của agent mở thành bảng ở panel phải, có nút hành động chính (`Add to Sequence`) | Chat › bảng | **Nên học**. Agent ra danh sách công ty rồi đưa thẳng vào campaign |
| U-P6 | 3 gợi ý bước tiếp (↳) sau mỗi câu trả lời | Chat | Nên học |
| U-P7 | Ô số liệu lồng: Reply rate chứa Positive / Positive + Objection; In progress chứa Queued; % ghi rõ "of Total" / "of replies" | Trang sequence | **Nên học**. Hết nhầm mẫu số |
| U-P8 | Bảng Enrollments: Status · Enrolled (khi nào, bởi ai) · Mailbox · Current step · Version | Trang sequence | **Nên học**. Gần đúng bảng recipients Saella cần |
| U-P9 | Số liệu theo từng bước: Scheduled / Finished / Paused / Blocked / Error + Delivered / Replied / Opened / Clicked / Opt-out / Bounced | Tab Steps | **Nên học** cho follow-up |
| U-P10 | Outbox tách Scheduled / Sent, có giờ hẹn gửi từng thư | Tab Outbox | **Nên học**. Người dùng thấy trước cái sắp gửi |
| U-P11 | Sửa sequence thành bản nháp: banner "unpublished changes", `Discard draft`, `See published version`, `Publish`; số liệu lọc theo `Version` | Editor | **Nên học**. Sửa follow-up đang chạy mà không phá batch đang gửi |
| U-P12 | Canvas dọc: thẻ bước + node chờ riêng ("Wait 4 Days") + `+` giữa các node | Editor | **Nên học**. Đơn giản hơn builder kéo thả |
| U-P13 | Dải tóm tắt chuỗi: Total steps · Days to complete · Automation % | Editor | Nên học (bỏ Automation % nếu Saella chỉ có email tự động) |
| U-P14 | Thư follow-up là "Re:" cùng thread, tiêu đề/nội dung sinh từ prompt, có `Show prompt` | Editor, tab Steps | Nên học. Đối chiếu PRD follow-up |
| U-P15 | Danh sách sequence: mỗi hàng có sẵn 8 chỉ số + nhãn Agentic / Draft + ☆ | Sequences | **Nên học** cho danh sách campaign |
| U-P16 | Bảng leads sắp theo "Last Web Activity", cột Last Sales Activity, Lead Source | Leads › People | Tham khảo. Saella chưa có web tracking |
| U-P17 | Mailbox có cột giới hạn gửi/ngày "50 / 50" + nhóm mailbox | Settings › Mailboxes | **Nên học** cho Settings › Sending |
| U-P18 | Credit: thanh "385 / 500 used", breakdown theo seat, credit dùng chung | Plans & billing | Tham khảo. Chỉ khi Saella tính credit |
| U-P19 | Custom fields dùng làm biến trong thư | Settings › General | Nên học. Hợp merge tag của template |
| U-P20 | Guided Setup panel phải, thẻ đã xong mờ + ✓ | Home lần đầu | Nên học cho Onboarding |
| U-P21 | Việc mẫu cá nhân hoá theo công ty người dùng + `Start demo` dùng dữ liệu mẫu | Home lần đầu | **Nên học**. Saella có ~3M công ty để làm việc mẫu thật |
| U-P22 | Home = ô chat; menu chính là thanh ngang, không sidebar | Toàn app | Không hợp. Saella có nhiều màn quản trị hơn, giữ sidebar |
| U-P23 | Chọn model AI (GPT 5.4 ▾) ngay ô nhập | Chat | Không hợp. Người dùng Saella không cần chọn model |
| U-P24 | Nút chính đen, màu thương hiệu chỉ cho chấm báo và tiến độ | Toàn app | Tham khảo. Saella dùng cam `#BF6603` cho nút chính |

### 5.4 Chức năng đáng cân nhắc cho Saella

Chỉ là ý tưởng; muốn làm phải đối chiếu PRD và hỏi team.

1. **Hàng đợi duyệt thư do agent soạn**: duyệt từng người, đánh dấu ready, gửi phần đã ready. Hợp với batch 5.000 người nếu có "Mark all as ready" + lọc.
2. **Version cho follow-up**: sửa thành bản nháp, publish mới áp; bảng recipients ghi người nhận đang ở version nào.
3. **Outbox**: danh sách thư đã hẹn giờ trước khi gửi, tách Scheduled / Sent.
4. **Phân loại phản hồi tối thiểu**: Positive / Objection, gắn vào Reply rate.
5. **Trạng thái bước chi tiết**: Paused / Blocked / Error, kèm "Bounce Stopped" (dừng chuỗi khi bounce).
6. **Giới hạn gửi/ngày theo mailbox** hiện ngay trong Settings › Sending.
7. **Agent nói độ tin cậy và lý do loại** khi lọc công ty.
8. **Việc mẫu ở onboarding** dựng từ dữ liệu công ty thật của Saella theo ngành người dùng.

### 5.5 Không nên học

- **Home chỉ là ô chat**: người không quen AI sẽ không biết bắt đầu từ đâu; Saella cần Overview có số liệu.
- **Chọn model** (GPT 5.4 / 5.6 Sol) ngay ô nhập: chi tiết kỹ thuật, không giúp người bán hàng.
- Banner upsell vàng trên trang Mailboxes, chen giữa màn cấu hình.
- Thời gian nghĩ dài ("Thought for 5m 11s") không có tiến độ rõ: cần thanh tiến độ hoặc danh sách bước nếu Saella có tác vụ agent dài.
- Bước Phone call, LinkedIn reminder, Dialer: ngoài PRD Saella.
- Nhiều ô số liệu hiện "--" và "0 people" khi chưa có dữ liệu, không có câu giải thích: Saella nên có trạng thái trống có chữ.

### 5.6 Gợi ý áp vào màn Saella hiện có

| Màn Saella | Lấy từ Unify |
|---|---|
| Overview | U-P7 (ô số lồng, % ghi rõ mẫu số) |
| Campaign / gửi batch | U-P2, U-P10, U-P15; ý tưởng 1, 3 |
| Follow-up (chuỗi) | U-P9, U-P11, U-P12, U-P13, U-P14; ý tưởng 2, 5 |
| Bảng recipients của template | U-P8 (thêm Current step, Version, Enrolled by), U-P7; ý tưởng 4 |
| Template + Write with AI | U-P14 (`Show prompt`), U-P19 (custom field làm biến) |
| Companies / Contacts | U-P5, U-P16; ý tưởng 7 |
| Settings (Sending/domain) | U-P17; ý tưởng 6 (domain DKIM/SPF/DMARC: Mobbin không có, không học được từ Unify) |
| Onboarding | U-P20, U-P21; ý tưởng 8 |
| Agent | U-P1, U-P2, U-P3, U-P4, U-P5, U-P6 |

---

## 6. Clay (web): đại diện nhóm AI SDR / AI agent làm sales

### 6.0 Nguồn và giới hạn

- **Đã thử trên Mobbin (web), theo thứ tự**: Artisan (Ava) → 11x → Clay → Relevance AI → Regie.ai → AiSDR.
  - **Artisan: không có.** Tìm "Artisan AI SDR Ava" ra OpenAI Platform, Elicit; tìm "Artisan" ra Etsy.
  - **11x: không có.** Kết quả là Suno, X.
  - **Clay: có**, nhiều flow nhất (13 flow liên quan, có flow 24 màn và 14 màn). Chọn Clay để viết chi tiết.
  - **Relevance AI: không có.** Kết quả là Langdock và chính Clay.
  - **Regie.ai: không có.** Kết quả là Clay.
  - **AiSDR: không có.** Kết quả là Vercel (AI SDK).
  - Vì không app nào khác có trên Mobbin, mục này không có phần "app khác 1–2 dòng".
- Ảnh Clay có 3 đợt, nhận ra qua tên bảng và ngày trong ảnh: **11/2023** (giao diện cũ, sidebar icon, nút "Enrich Data"), **1/2025** (thanh "Complete onboarding (60%)" trên đầu bảng), **3–4/2026** (sidebar có chữ, có Sculptor, Claygents, Campaigns; agent ghi "Apr 1, 2026"). Khi khác nhau, ghi theo bản 2026.
- **Lưu ý tên trùng**: Mobbin có app "Clay" thứ hai (CRM cá nhân, nền tối, "How are you planning to use Clay?"). Đó là app khác, **không dùng** trong mục này.
- **Clay không phải AI SDR tự gửi thư** như Artisan/11x. Agent của Clay có hai dạng:
  - **Sculptor** (`Beta`): trợ lý chat điều khiển app (lọc bảng, thêm cột, sửa prompt agent). Gần nhất với "agent" của Saella.
  - **Claygent**: agent nghiên cứu chạy theo từng dòng trong bảng (mỗi ô là một lần chạy).
- **Mobbin không có** (nên không viết): agent tự gửi email thay người; hàng chờ duyệt thư trước khi gửi; báo cáo agent đã làm gì trong ngày; nút pause cả agent; Sculptor ở chế độ `Analyze` trả lời câu hỏi; tab `Analytics` và `Replies` của campaign mở ra; Global inbox. Luồng duyệt 2 bước hay 5 bước của Saella **không có mẫu trực tiếp** ở Clay.

### 6.1 Khung app (IA)

```
┌────────────────┬──────────────────────────────────────────────────────┐
│ clay           │           [Upgrade your plan] Credits (?) 🔔  Alex S. │
│ Home           ├──────────────────────────────────────────────────────┤
│ Find leads   › │  Hey Alex, ready to get started?        [Show less ^] │
│ ─────────────  │  [◐ Ask me anything about Clay or describe…     ↑ ]  │
│ Signals        │  [Find leads] [Import data] [Create a campaign]       │
│ Ads   Upgrade  │  [Start from template]                                │
│ Campaigns      │  All files / Recents / Favorites      [search] [+ New]│
│ Claygents      │  Name · Favorite · Tags · Created at · Owner · Access │
│ …              │                                                       │
│ Exports        │                                                       │
│ Trash          │                                                       │
│ Settings       │                                                       │
│ AI context     │                                                       │
│ Resources    › │                                                       │
└────────────────┴──────────────────────────────────────────────────────┘
```

- **Sidebar ngắn**: Home, Find leads, Signals, Ads, Campaigns, Claygents. Cuối: Exports, Trash, Settings, **AI context**, Resources.
- **AI context** là mục riêng ở sidebar (không giấu trong Settings): nơi khai báo doanh nghiệp, ICP, persona để mọi tính năng AI dùng chung.
- **Home** mở đầu bằng ô chat "Ask me anything about Clay or describe what you'd like to do…" + 4 thẻ lối tắt. Bên dưới là danh sách file (bảng, campaign).
- **Trong một bảng / campaign**: thanh tab dưới đáy giống Excel (`Overview` · từng bảng · campaign · `+ Add`), breadcrumb trên cùng (`All Files / UX Directors in Finance / 2026-03-31 New campaign`).
- **Sculptor** là panel trái trong bảng, hoặc panel phải ở Find People, hoặc panel trái trong trình dựng agent. Không có trang chat toàn màn riêng.
- Top bar luôn có `Credits`. Nhiều chỗ hiện giá theo credit (`3 / row`, `~30 total`, `Charged: 3`).

### 6.2 Flow

#### S1. Dựng agent bằng câu tự nhiên (Claygents): flow quan trọng nhất
[Building an agent](https://mobbin.com/flows/9700a29d-77f6-477f-a1e1-dee35d99d421) (9 màn) · [Claygents](https://mobbin.com/flows/e8fe25da-3998-4729-8397-636c1afa12ac)

- **Trang Claygents**: tiêu đề "Start building your Claygent in natural language", ô nhập lớn "Describe your task in natural language and we'll create an AI Agent for you… (Tip: Type "@" to mention files and business context)".
  - Dưới ô nhập: dropdown model `Automatically assign model` · `Upload files` · nút `Build Agent`.
  - Dropdown model: mỗi model có mô tả 1–2 câu và **giá credit ngay cạnh tên** (Helium 1, Neon 2, Argon 3 kèm badge `recommended`, Xenon 15, Radon 45). Mục đầu "Automatically assign model · We'll determine the best model for your use case".
  - `Upload files` mở modal "Browse documents": tab Files / Google Docs / Notion; trống: "No documents found · Upload a file to get started". Tải xong: toast xanh "Upload complete." và file hiện thành chip `× PDF File.pdf` ngay trong câu lệnh.
  - "Start with a template": 4 thẻ **Prospecting**, **Account Scoring**, **Contact Scoring**, **Copywriting**, mỗi thẻ có 1 dòng mô tả. Link "Prefer to start from scratch?".
  - "Browse Claygents": bảng Name · Prompt (đoạn đầu) · Version · Tools · Last updated · Owner. Trống: "You haven't created any agents yet."
- **Màn dựng agent** (3 cột): `Sculptor Beta` bên trái · `Prompt` ở giữa · `Configuration` bên phải. Thanh trên: `v1` · `···` · `Test` · `Chat` · `Save` · `Add to table`.
  - **Sculptor hiện tiến độ từng bước**: mỗi bước là một dòng có dấu tick xanh + chữ đậm **"Thinking"** + 1–2 câu đang nghĩ gì ("I need to view the prompt file to see what's there currently.", "The prompt is empty. Now let me check the current model configuration."), có `Show more`. Cuối là ba chấm màu khi còn chạy.
  - **Mỗi thay đổi agent làm là một thẻ tóm tắt có đếm dòng**: "Prompt updated **+48** › Show more", "Model configuration updated **+1 −1** › Show more".
  - **Phần agent vừa viết được tô nền xanh** trong ô Prompt, nhìn là biết chữ nào do AI thêm.
  - **Khi đang chạy, nút gửi đổi thành nút vuông (■)** để dừng. Xong thì trở lại nút mũi tên.
  - Toast góc phải: "Model updated by Sculptor", sau khi lưu: "Agent saved successfully".
  - Cuối lượt, Sculptor tóm tắt bằng danh sách đánh số: Input Variables (`{{founderName}}`…), Output Format (có "Confidence score (0-100) on personalization quality"), Model ("Upgraded to GPT-5 for better research capabilities…"), và câu giải thích agent sẽ dùng file PDF thế nào.
  - Ô nhập Sculptor: "Ask Sculptor to edit your prompt or output format…".
- **Cột Prompt**: hướng dẫn "Use {{inputName}} syntax to define inputs. Use @ to add context from your documents, enrichments, and business context. **Highlight text to generate changes.**" Biến hiện thành chip `× companyName`.
- **Cột Configuration**: Model · **Inputs** (mỗi biến có kiểu `text` / `url`) · **Outputs** (`Fields` hoặc `JSON Schema`, nút `Generate from prompt`, `+ Add output`) · **Tools**: toggle "Web search · Give this agent the ability to search the internet for more context.", toggle "Access all business context · Include all of your ideal customer profile and company details…", và Notion.

#### S2. Agent chạy trên bảng: xem trước chi phí, chạy thử, theo dõi, dừng
[Adding enrichment (use AI)](https://mobbin.com/flows/6eab9e87-77aa-4933-b56b-942b3dc8f639) (11 màn, ảnh 1/2025) · [Use AI](https://mobbin.com/flows/85f1a865-bbec-4155-8cc4-ff89ca3c6983) · [Searching AI templates](https://mobbin.com/flows/e144ed02-386d-4b69-8b46-413f368c5b66)

- **Add enrichment** (modal): ô tìm, tab Discover / Integrations / Templates / Recipes, cột trái nhóm (Favorites, Suggestions, AI, Enrich company info…). Mỗi công cụ ghi **giá theo dòng** (`1 / row`, `0.5 / row`).
- **Panel "Use AI"** (phải): `Browse Templates` · `Save as template` · Model (`Claygent > Argon`) · Prompt (chèn cột bằng `/`) · nút **`Help me`** · Define Outputs · **Run Settings**: toggle `Auto-update`, ô `Only run if` (điều kiện chạy). Đáy: chip giá `3 / row` + `Save ▾`.
- **"Help me"** mở modal "Generate a Claygent prompt": nhập mục tiêu → `Generate prompt` → AI viết prompt dài → 👍/👎 + **`Regenerate` / `Accept prompt`**. Người dùng chấp nhận thì prompt mới vào ô.
- **Nút Save tách 3 lựa chọn, kèm tổng chi phí ước tính**:
  - `Save and run 10 rows` · `~30 total`
  - `Save and run 25 rows in this view` · `~75 total`
  - `Save and don't run`
  Đây là cách Clay "xin duyệt" trước khi tốn credit: chạy thử vài dòng trước, hoặc lưu mà chưa chạy.
- **Đang chạy**: cột mới tô xanh, từng ô hiện `Queued...`. Đáy bảng: `Updating Cells` (icon xoay) · **`Stop updates`** · `View table history`. Toast đen "Cells running".
- **Xong**: mỗi ô có **chấm xanh** (có kết quả) hoặc **tam giác cam** (kết quả yếu, ví dụ "Legal name not found."). Ô không đủ điều kiện ghi `Run condition not met`.
- **Bấm vào ô → panel "Cell details"**: `Response` · **`Reasoning`** (đoạn giải thích agent đã tìm ở đâu, vì sao ra kết quả) · **`Confidence high`** · **`Steps Taken [3]`** (mở ra được) · **`Charged: 3`**.
- **Use AI Templates** (modal): ô tìm, chip lọc All / Company Info / People Info / Email First Lines; mỗi mẫu có tên + 1–2 câu mô tả ("Use time in department to write email first line…"). Panel Use AI bản 11/2023 có `Try on 5 rows · Free` cạnh `Save & Run first 10 rows`.

#### S3. Sculptor điều khiển bảng (panel chat bên cạnh dữ liệu)
[Filtering a table](https://mobbin.com/flows/10bfd18f-073f-4cb4-a648-37cb6c4d0dba) (5 màn, 3/2026)

- Panel trái **Sculptor `Beta`**, đầu panel có các icon cài đặt / lịch sử / `+` (chat mới) / ✕.
- Có link "↑ View previous messages". Câu mở: "Great! Your table is all set up. **I remember our previous conversation** about creating this table, so I'm ready to help you work with it." Dưới mỗi câu trả lời: copy · 👍 · 👎.
- Ô nhập "Ask questions and add enrichments…" + **2 chế độ: `Build` / `Analyze`** (Build = làm thay đổi bảng, Analyze = hỏi đáp). Không thấy ảnh chế độ Analyze đang trả lời.
- **Thanh trạng thái dưới bảng, luôn hiện**: thanh tiến độ xanh + "**100% of table completed**" ✓ · nút **`Stop`** (xám khi không có gì chạy) · **`History`** · ⚙.
- Thanh trên bảng: toggle **`Auto-run`** · số cột `28/30` · số dòng `10/10` · Filter · Sort · Search · nút `Tools`.
- Hàng đầu bảng là hàng trạng thái cột: "✓ Up to date" hoặc "100%".
- Panel `Tools` (phải): tab Sources / **Enrichments** / Signals / Exports; mỗi enrichment có giá (`~3 / row`, `/ model`); `Load More`, `View all enrichments`.

#### S4. Tìm lead có Sculptor gợi ý
[Onboarding](https://mobbin.com/flows/5f5cb139-df46-4277-aa5f-64e374b25298) (màn cuối) · [Finding people](https://mobbin.com/flows/bb69d349-c56a-4921-8d76-15ea16c0d1de) (14 màn, bản 11/2023)

- **Find People (2026)** chia 3 cột: "Refine with filters" (accordion: Company attributes, Job title, Experience, Location, Professional bio…, Exclude people `Upgrade`, Limit results) · "Preview" (bảng mẫu, nút `Chat with Sculptor`) · panel Sculptor.
- Đáy: "Showing 50 of **318,408,675** results" + `Continue ▾`. Trên panel lọc: `See past searches ▾` · `Save search`. Limit: "Your table has a 1,000 row limit. Upgrade for more."
- **Sculptor trống** tự giới thiệu: "I'm Sculptor, your AI assistant for Clay. Tell me what you're looking for and I'll help configure your filters." + "Here are some examples of what I can do. Add your **business context** to get personalized suggestions." + 2 thẻ gợi ý bấm được ("Find CXOs in the US", "Find people with a title of Head of Sales in EMEA"). Ô nhập "What are you looking for?".
- **Bản 2023**: modal "Find People using LinkedIn": lọc bên trái, bên phải là hướng dẫn 3 bước ("1. Filter by… 2. Hit "Preview"… 3. Import your list…"). Bấm `Preview People` → "Generating your preview. This may take a few moments..." → "Previewing **6 people from 4 out of 7 companies** from 10 search results" + `Import People to New Table`. Xem trước rồi mới nhập.

#### S5. Campaign: AI soạn chuỗi thư, người dùng lưu nháp rồi mới Launch
[Create a campaign](https://mobbin.com/flows/aba7409b-240b-4041-bdae-45002fabb00d) (11 màn, 3/2026) · [Campaigns](https://mobbin.com/flows/70c56008-83e7-4709-b712-37e9b2ef5e55)

- **Danh sách Campaigns**: tab Sequences / Email accounts / Global blocklist; nút `Global inbox` · `Global analytics` · `+ New campaign`. Bảng: Name · Status (`Draft`) · Leads · Sent · Reply rate · Bounce rate · Owner · Last modified.
- **Trang campaign**: tab `Sequence` · `Settings` · `Analytics` · `Replies`; góc phải: badge **`Draft`** · `Create events table` · **`Launch campaign`** (mờ tới khi đủ điều kiện).
- **Cột trái "Campaign setup"**: "Import leads, draft message sequences, and select which email accounts to send from." + link video / docs.
  - **Leads**: `+ Add lead list` → modal "Select table" (duyệt thư mục, tick chọn). Chọn xong: "Rows from: UX Directors, Finance Industries › Work". Dòng giải thích: "We will automatically deduplicate records based on this field to ensure each lead is sequenced only once."
  - **AI đoán cột email và chờ người xác nhận**: khung xanh "ⓘ This is a suggested lead email address column. **Save to confirm.**"
  - **Messages (0/4)** + chip `Missing fields`; toggle Enable HTML kèm cảnh báo "HTML can negatively affect deliverability for cold outbound."
  - Đáy: chip "1 per lead sequenced" · `Save campaign` → `✓ Saved`.
- **Cột giữa**: danh sách Leads (10) dạng chip email; dòng thiếu email ghi `Empty`.
- **Cột phải**: switch `Sequence` / `Lead data`. Khi chưa có thư: "**Draft messages with AI** `Beta` · Generate a personalized email using your **business context**" + ô "Describe the goals of your campaign to generate your first message" + `Generate campaign` + **4 chip mục tiêu mẫu** ("Reach out to warm leads who have already engaged", "Book demo meetings with cold prospects", "Announce a new product launch", "Drive signups for an upcoming event or webinar").
- **Soạn thư** ("Message drafting"): Email name (internal only) · Subject · Body; dưới mỗi ô "Type '/' to Use AI, reference column data and more!". Đáy `Cancel` / `Save draft`.
- **Preview thư bên phải, biến tô tím**. Khi biến không khớp cột, preview hiện thẳng câu hỏi trong biến: "{Could you please specify which company's name you are referring to?}". Sửa xong thì preview về `{Company Name}`.
- Lưu nháp xong: thư thành một dòng `✉ Opener` + 🗑 trong cột trái, preview có nút ✎ và nút `+` để thêm bước. `Launch campaign` lúc này mới sáng.

#### S6. AI context: khai báo doanh nghiệp / ICP / persona bằng AI
[Generating business context with AI](https://mobbin.com/flows/45051fc5-954d-4433-9701-041a7c3f42ad) (3 màn)

- Settings › **AI context**. Mục "My business context: Give Sculptor some more context about your company and your goals. This will be used to inform our AI tools and better tailor any auto-generated suggestions made by our AI."
- Khung "**Generate business context with AI**": "Let Sculptor automatically research your company domain & generate your business context. **This should take between 10 and 30 seconds.**" + ô domain + `Generate`.
- 3 ô văn bản AI điền sẵn, người dùng sửa được: **Company description** · **Ideal customer profile** · **Ideal buyer personas** (mỗi ô có 1 câu hướng dẫn nên viết gì). Kết quả có ghi nguồn dạng link.
- Sidebar Settings: Workspace, AI context, Team, Connections, Web intent, Plan & billing, Usage, Referrals, Enrichments, Ads; Account.

#### S7. Onboarding: hỏi ngắn, dẫn thẳng vào việc đầu tiên
[Onboarding](https://mobbin.com/flows/5f5cb139-df46-4277-aa5f-64e374b25298) (24 màn)

- Đăng ký chia đôi: trái là form (`Sign up with Google` / tên / email / mật khẩu, checklist "at least 8 characters" chuyển xanh); phải là **bảng dữ liệu mẫu thật** "Prospect intent tracker" (Event: Job Change, Previous Company, New Company) + thẻ nổi "Acme · Hired a new Head of Growth", "Melissa · Was promoted to VP of Sales".
- Lỗi rõ: "Full name must contain at least a first and last name", "Email cannot be used". Màn "Verify your email" + `Resend verification link`.
- Sau đó mỗi màn **một câu hỏi, chọn bằng chip**, có thanh tiến độ xanh mảnh trên cùng và nút ← quay lại: Create your workspace (logo + tên) → What team are you on? (RevOps / Agency / Marketing / Sales / Other) → What CRM or database do you use? (có "I don't have a CRM/Database") → What tools do you use? (chọn nhiều) → How did you hear about Clay? (ô tự do).
- **Màn cuối "How would you like to get started?"**: chọn 1 trong 5 việc (Find and enrich people, Find and enrich accounts, Generate pre-meeting notes, AI outbound messaging, Automate account research) → `Start my first project` → mở thẳng Find People với Sculptor chờ sẵn (S4).
- Bản 1/2025: trên đầu bảng có thanh "Complete onboarding (40%)" → "(60%)" màu cam, theo người dùng qua các màn.

#### S8. Signal: agent theo dõi định kỳ, báo trước chi phí lặp lại
[Adding job posting events](https://mobbin.com/flows/d8b56a49-30df-404c-8bd9-7a1c9451ed54) (8 màn, 3/2026)

- Trình tạo toàn màn "Track companies in an existing table for new job postings": thanh tiến độ 4 đoạn, "Step 3 · Choose run frequency · We'll check the signal on your selected schedule and add any new results we find." · Frequency `Monthly`.
- Bên phải: Preview bảng, băng xanh "This is a preview showing up to 10 sample results."
- Đáy trái: "**Your recurring cost will be ~4 credits per run.**" · "Your recurring action cost will be ~20 actions per run." · chip `~4 / mo` · `Previous` / `Next`.
- Sau khi tạo, panel cấu hình signal: Run Settings có khung xanh "✓ **Last checked for changes on 03/31, 01:48 PM**", Frequency, toggle **`Enabled`** ("While this signal is enabled, results that meet the filters above will be added as new rows to this table."), `Delete signal`, đáy `Save only` / `Save and re-run`. Cột sự kiện ghi "Waiting for events...".

### 6.3 Danh mục pattern

| # | Pattern | Clay dùng ở | Đánh giá cho Saella |
|---|---|---|---|
| S-P1 | Agent hiện từng bước "Thinking" có tick xanh + 1 câu đang làm gì, `Show more` | Sculptor khi dựng agent | **Nên học**. Đúng nhu cầu "hiện việc đang làm" của agent Saella |
| S-P2 | Mỗi thay đổi agent làm là một thẻ tóm tắt có đếm (`Prompt updated +48`, `+1 −1`) | Sculptor | **Nên học**. Làm thẻ "đề xuất thay đổi" trong luồng duyệt |
| S-P3 | Phần AI vừa viết được tô nền màu ngay trong nội dung | Prompt editor | **Nên học**. Áp cho template / thư agent soạn |
| S-P4 | Nút gửi đổi thành nút Stop (■) khi agent đang chạy | Ô nhập Sculptor | **Nên học**. Khớp nút Stop của Saella |
| S-P5 | Nút lưu tách 3 lựa chọn: chạy thử 10 dòng / chạy cả view / lưu không chạy, kèm tổng chi phí | Use AI › Save | **Nên học**. Mẫu tốt cho "duyệt trước khi gửi batch" |
| S-P6 | Thanh trạng thái dưới bảng: % hoàn thành + `Stop` + `History`, luôn hiện | Bảng có Sculptor | **Nên học** cho tiến độ gửi campaign |
| S-P7 | Ô kết quả có chấm xanh / tam giác cam; bấm ra Reasoning · Confidence · Steps Taken · Charged | Cell details | **Nên học**. Agent phải giải thích vì sao |
| S-P8 | AI đoán cấu hình, hiện khung "This is a suggested… Save to confirm." | Campaign › Leads | **Nên học**. Mẫu duyệt 1 chạm cho thao tác nhỏ |
| S-P9 | Preview thư hiện biến tô màu; biến lỗi hiện câu hỏi ngay trong preview | Campaign › Message drafting | **Nên học** cho Template preview |
| S-P10 | Campaign ở `Draft`, `Launch campaign` chỉ sáng khi đủ leads + thư | Trang campaign | **Nên học**. Bước cuối của luồng duyệt |
| S-P11 | Ô "mô tả mục tiêu" + 4 chip mục tiêu mẫu để AI soạn chuỗi thư | Draft messages with AI | **Nên học** cho tạo campaign bằng agent |
| S-P12 | AI tự nghiên cứu domain để điền Company description / ICP / Personas, có hẹn giờ "10–30 seconds" | AI context | **Nên học** cho onboarding + Settings |
| S-P13 | Ngữ cảnh doanh nghiệp là mục riêng, mọi tính năng AI dùng chung, nhắc lại ở nhiều nơi ("Add your business context…") | Sidebar, Sculptor, Campaign | **Nên học** |
| S-P14 | Sculptor trống: tự giới thiệu 1 câu + 2 thẻ ví dụ bấm được | Find People | **Nên học** cho panel agent trống |
| S-P15 | Agent nhớ hội thoại trước theo từng bảng ("I remember our previous conversation…") + "View previous messages" | Sculptor trong bảng | Nên học. Gắn lịch sử chat theo campaign |
| S-P16 | Hai chế độ Build / Analyze ngay dưới ô nhập | Sculptor | Nên học. Tách "làm" và "hỏi" rõ ràng |
| S-P17 | `Help me` viết prompt → `Regenerate` / `Accept prompt` + 👍/👎 | Use AI | **Nên học**. AI đề xuất, người chấp nhận |
| S-P18 | Dựng agent bằng một câu + template + @ để đính tài liệu | Claygents | Tham khảo. Saella chỉ có một agent, không cho người dùng tạo agent |
| S-P19 | Chọn model, giá credit theo model | Claygents | Không hợp. Người dùng Saella không cần chọn model |
| S-P20 | Onboarding mỗi màn một câu, chip, thanh tiến độ mảnh; màn cuối chọn việc đầu tiên rồi vào thẳng app | Onboarding | **Nên học** |
| S-P21 | Màn đăng ký có bảng dữ liệu mẫu thật bên phải | Sign up | Nên học. Khoe dữ liệu 3M công ty ĐNÁ |
| S-P22 | Việc chạy định kỳ: báo trước chi phí mỗi lần chạy, "Last checked…", toggle Enabled, `Save only` / `Save and re-run` | Signals | Nên học cho follow-up tự động |
| S-P23 | Xem trước kết quả tìm (n người từ m công ty) rồi mới nhập | Find People 2023 | Nên học |
| S-P24 | Lưu bảng (dedupe) nói rõ bằng 1 câu: "each lead is sequenced only once" | Campaign › Leads | Nên học |

### 6.4 Chức năng đáng cân nhắc cho Saella

Chỉ là ý tưởng; muốn làm phải đối chiếu PRD và hỏi team.

1. **Chạy thử trước khi gửi cả batch**: agent gửi thử cho 5–10 người (hoặc gửi test về hộp thư mình) rồi mới cho gửi hết.
2. **Báo trước số lượng / chi phí** của thao tác ghi: "Gửi 240 email · dùng 240 lượt gửi" trước khi người dùng bấm duyệt.
3. **Reasoning + Confidence cho mỗi việc agent làm**: vì sao chọn công ty này, vì sao viết câu mở đầu này.
4. **Business context dùng chung**: một trang khai báo công ty / ICP / persona, AI tự điền từ domain; agent, Write with AI, tìm lead đều đọc từ đây.
5. **Agent đoán, người xác nhận**: các lựa chọn nhỏ (cột email, người gửi, lịch gửi) agent điền sẵn với nhãn "Đề xuất · Lưu để xác nhận".
6. **Lịch sử chat gắn theo từng campaign / danh sách**, agent nhớ ngữ cảnh khi quay lại.
7. **Chế độ "Hỏi" và "Làm"** tách rõ trong ô nhập agent: chế độ Hỏi không bao giờ tạo thao tác ghi.
8. **Follow-up định kỳ có "Lần kiểm tra cuối"** và toggle bật/tắt, giống Signal.

### 6.5 Không nên học

- **Prompt editor, JSON Schema, chọn model, biến `{{inputName}}`**: dành cho người kỹ thuật (RevOps). Người dùng Saella không làm prompt.
- **Nhiều tên gọi AI**: Sculptor, Claygent, Use AI, Help me, Draft messages with AI. Người mới khó biết cái nào là cái nào. Saella giữ một tên: **agent**.
- **Credit ở khắp nơi** (`3 / row`, `~30 total`, `Charged: 3`, giá theo model): chỉ học cách báo trước số lượng, không học mức chi tiết này.
- **Upsell dày**: `Upgrade your plan` xanh đậm ngay top bar, `Upgrade` cạnh mục sidebar và trong bộ lọc, cạnh tranh với nút chính.
- **Bảng kiểu bảng tính dày đặc** (30 cột, tab dưới đáy): quá nặng với người không làm data.
- **Toast nhiều màu** (xanh lá, đen) ở góc phải đè lên nút Save: dễ che nút.
- **Không có hàng chờ duyệt thư** trước khi gửi: Clay dựa vào "Draft" + "Launch". Saella cần duyệt rõ hơn vì agent tự đề xuất thao tác ghi.

### 6.6 Gợi ý áp vào màn Saella hiện có

| Màn Saella | Lấy từ Clay |
|---|---|
| **Agent (chat toàn trang)** | S-P1 bước "Thinking" có tick; S-P4 nút Stop thay nút gửi; S-P16 Build/Analyze; S-P14 trạng thái trống có ví dụ; S-P15 nhớ hội thoại |
| **Agent (panel chat)** | S-P2 thẻ thay đổi có đếm (`+48`); S-P8 "Đề xuất · Lưu để xác nhận"; S-P13 nhắc thêm business context khi thiếu |
| **Luồng duyệt** | Xem dưới bảng |
| Campaign | S-P5 chạy thử / chạy hết / lưu không chạy; S-P6 thanh % + Stop; S-P10 Draft → Launch; S-P11 chip mục tiêu; S-P24 câu dedupe |
| Template + Write with AI | S-P3 tô màu chữ AI viết; S-P9 preview biến tô màu, biến lỗi hỏi ngay; S-P17 Regenerate / Accept |
| Companies / Contacts | S-P7 Reasoning + Confidence cho gợi ý lead; S-P14 gợi ý tìm bằng câu; S-P23 xem trước rồi mới nhập |
| Settings | S-P12 + S-P13: trang Business context (Company / ICP / Personas) có nút AI điền từ domain |
| Onboarding | S-P20 một câu mỗi màn + chip; màn cuối chọn việc đầu tiên rồi mở agent; S-P12 tạo business context từ domain; S-P21 dữ liệu mẫu thật |
| Overview | S-P6 thanh tiến độ việc agent đang chạy; S-P22 "Lần kiểm tra cuối" cho follow-up |

**Gợi ý cho luồng duyệt 2 bước hay 5 bước** (suy ra từ Clay, Clay không có mẫu đúng như vậy):

- Clay thực chất dùng **2 mức tuỳ độ rủi ro**:
  - **Thao tác nhỏ, hoàn tác được** (đoán cột email, sửa prompt): agent làm luôn, hiện thẻ tóm tắt / khung "Save to confirm", người dùng xác nhận một chạm (S-P2, S-P8).
  - **Thao tác tốn tiền hoặc ra ngoài** (chạy agent trên nhiều dòng, launch campaign): có bước xem trước số lượng + chi phí và chọn **chạy thử** hay **chạy hết** (S-P5, S-P10).
- Áp cho Saella: **mặc định 2 bước** (Xem đề xuất → Duyệt), nhưng bước 1 phải đủ thông tin của Clay: tóm tắt thay đổi có đếm, preview, số người nhận, và lựa chọn "Gửi thử trước". Chỉ hành động gửi email hàng loạt mới cần thêm bước gửi thử. Không cần 5 bước riêng cho mọi thao tác ghi.
- Trong lúc chạy: thanh % + nút Stop luôn hiện (S-P6), nút gửi chat thành Stop (S-P4). Sau khi chạy: mỗi kết quả có trạng thái xanh / cam và mở ra được lý do (S-P7).

---

## 7. Hunter.io (web)

### 7.0 Nguồn và giới hạn

- **Mobbin không có Hunter.io bản web** (kiểm tra ngày 2026-10-29).
- Đã thử 2 truy vấn `search_flows`, platform web, limit 2:
  - "Hunter": ra 2 flow của **Apollo** ("Setting up an account", "Prospect and enrich").
  - "Hunter.io email finder": ra flow của **Apollo** ("Searching people") và **7shifts** ("Contacts").
- Không có ảnh Hunter.io nào nên **không mô tả** Domain Search, Email Finder, Email Verifier, Discover, Leads, Campaigns, bulk tasks, onboarding hay credits. Không đoán từ trí nhớ.
- Các mục 7.1 đến 7.6 để trống. Muốn có mục này thì cần nguồn khác: ảnh chụp tự làm trên tài khoản Hunter (bản free), hoặc tài liệu công khai của Hunter, và ghi rõ nguồn đó.
- Phần tìm email theo người / trạng thái email / credit đã có ở mục 2 (Apollo): A-P4 (trạng thái email 3 mức), nút `Access email` tốn credit, `View credit usage`.

### 7.1 Khung app (IA)

Không có dữ liệu (Mobbin không có).

### 7.2 Flow

Không có dữ liệu (Mobbin không có).

### 7.3 Danh mục pattern

Không có dữ liệu (Mobbin không có).

### 7.4 Chức năng đáng cân nhắc cho Saella

Không có dữ liệu (Mobbin không có).

### 7.5 Không nên học

Không có dữ liệu (Mobbin không có).

### 7.6 Gợi ý áp vào màn Saella hiện có

Không có dữ liệu (Mobbin không có). Tạm dùng mục 2 (Apollo) cho các chủ đề xác thực email và credit.

---

## 8. Buffer (web)

### 8.0 Nguồn và giới hạn

- Ảnh từ Mobbin, app "Buffer" bản web. Có **2 đợt giao diện** (suy từ ngày trên lịch và ô chọn ngày trong ảnh):
  - **Bản cũ (~8/2025)**: thanh menu ngang trên cùng `Create · Publish · Engage (sau đổi Community New) · Analyze · Start Page`, nút chính xanh dương, cột trái là danh sách kênh.
  - **Bản mới (~6/2026)**: sidebar trái `Home · Create · Publish · Community · Start Page ↗ · Analytics ↗`, nút `+ New` xanh lá nhạt, nền be ấm. Khi hai bản khác nhau, ghi theo bản 2026.
- Đã xem **19 flow** và 6 lượt tìm màn: kết nối kênh, cài đặt kênh / lịch đăng, trình soạn bài, lên lịch, queue / calendar / list, ý tưởng + AI Assistant, analytics + report, Start Page, mời thành viên, nhóm kênh, saved replies, Community (bình luận), onboarding.
- **Mobbin chưa có / không thấy rõ**:
  - Trình soạn khi chọn **nhiều kênh cùng lúc và bấm `Customize for each network`**: chỉ thấy nút này ở trạng thái trống, không thấy màn sau khi bấm.
  - **Nội dung tab Approvals** (duyệt bài): chỉ thấy tab có icon tia sét (tính năng trả phí), không thấy danh sách chờ duyệt hay nút duyệt.
  - **Analytics có số liệu thật**: chỉ thấy trạng thái trống (toàn số 0), không thấy biểu đồ.
  - Trang **Home** bản mới; trình soạn cho TikTok / YouTube / LinkedIn (chỉ thấy Instagram).
- Buffer không hỗ trợ **Douyin** (danh sách kênh ở onboarding không có). Buffer bán cho cá nhân / doanh nghiệp nhỏ làm nội dung; Start Page (trang link-in-bio) và Shop Grid ngoài phạm vi Saella, chỉ ghi ngắn.

### 8.1 Khung app (IA)

```
┌───────────────┬──────────────────────────────────────────────────────┐
│ Buffer    🌱1 │ (⊞) All Channels           💬  [List|Calendar] [+ New Post]│
│ [  + New   ]  ├──────────────────────────────────────────────────────┤
│ Home          │ Queue 3 · Drafts 2 · Approvals ⚡ · Sent 10           │
│ Create        │            [Channels ▾] [Tags ▾] [🌐 Los Angeles ▾]   │
│ Publish     3 │                                                      │
│ Community   1 │  Hôm nay, June 23                                    │
│ Start Page ↗  │  11:44 AM  ┌ thẻ bài: avatar kênh · nội dung · ảnh ┐ 💬│
│ Analytics ↗   │            └ You created this… [Reschedule][✎][⋮]  ┘  │
│ Channels      │                                                      │
│  ◉ hello.asmith 3                                                    │
│  ◉ as cupcake 0                                                      │
│ Connect channels                                                     │
│  LinkedIn / Bluesky / Facebook / + More channels                     │
│ ┌ 2/3 channels connected ✕ ┐                                         │
│ └ ▬▬▬▬──                    ┘                                         │
│ AS Mobbin · Team Plan    ⇤  │                                    (?) │
└───────────────┴──────────────────────────────────────────────────────┘
```

- **Sidebar chia 3 phần**: điều hướng chính · **Channels** (kênh đã kết nối, avatar kèm logo mạng nhỏ ở góc, số bài trong queue) · **Connect channels** (các mạng chưa kết nối, bấm là kết nối, cuối có `+ More channels`).
- **Thẻ tiến độ cuối sidebar**: "1/3 channels connected" + thanh 3 đoạn, đóng được (✕). Đây là checklist onboarding gọn nhất trong các app đã xem.
- **Nút `+ New`** mở menu: `Post` (Publish content to a channel) · `Idea` (Capture a content idea) · `Connect a New Channel` · `Create a Start Page` · `Invite a Team Member` (⚡). Bản cũ có phím tắt `N P`, `N I`.
- **Publish** là trung tâm: xem theo "All Channels" hoặc từng kênh; mỗi kênh có tab **Queue · Drafts · Approvals · Sent** (có đếm), đổi **List / Calendar** (kênh Instagram còn có **Grid**).
- **Settings** là trang riêng, sidebar phụ: Account (Profile, Preferences, Notifications) · Organization (General, Channels, Team Members, Billing) · Features (Tags, Channel Groups ⚡, Saved Replies) · Other (API `New`, Apps & Extras, Beta Features, Refer a Friend, Integrations `New`).
- **Analytics** mở ra ứng dụng riêng ("← Back to Main App"), sidebar riêng: Home · Channels (Facebook, Instagram, Twitter / X, LinkedIn) · Tools (Tags, Reports).
- Màu bản 2026: nền be/kem, nút chính xanh lá nhạt, nút xoá hồng nhạt; AI dùng tím (nút `Insert`, khung kết quả).

### 8.2 Flow

#### B1. Kết nối kênh
[Connecting to Instagram](https://mobbin.com/flows/b3979e20-82f3-4a97-8a02-ead37271103f) (7 màn) · [Connecting Instagram](https://mobbin.com/flows/c245490f-504a-44aa-baea-d6207d664dfe) (10 màn)

- Vào từ 4 chỗ: menu `+ New` › `Connect a New Channel`; mục `Connect Instagram / Threads / LinkedIn` ngay trên sidebar; nút `+ Connect a Channel` ở màn trống; `Settings › Channels › Connect Channel`.
- **Màn trống Publish**: icon lịch + "Welcome to Buffer 👋" + "Connect a channel to start scheduling posts" + `+ Connect a Channel`.
- Đi sang **màn cấp quyền của Instagram** (OAuth): danh sách quyền có toggle (View profile and access media (required) · Access and manage comments · Access and publish content · Access and manage insights) + `Allow` / `Cancel`.
- Có nhánh **tài khoản Instagram cá nhân**: modal "Add Your Instagram Personal Account to Buffer" (Account name, Avatar optional) → modal **"Schedule Posts With Notifications"**: 3 bước có hình ("Create a post with 'Notify Me' On" → "Open the Buffer App notification" → "Tap 'Open in…' and finish your post"), nút `Remind Me Later` / `Set Up Notifications`. Tức là loại tài khoản không cho đăng tự động thì Buffer nhắc người dùng đăng tay qua app điện thoại.
- Đầu modal có dải icon "Buffer ⇄ Instagram" cho biết đang nối gì với gì; đáy có `Help ▾`.
- Kết nối xong: kênh hiện trong sidebar, mở thẳng queue của kênh với dòng **"0/1 posts sent this week"** và các ô giờ trống `+ New` theo lịch mặc định.

#### B2. Cài đặt kênh và lịch đăng (Posting Schedule)
[Channel settings](https://mobbin.com/flows/49e1bcfa-d3bd-413a-bf55-b12328169b97) · [Cleaning a queue](https://mobbin.com/flows/00ab723f-9d7b-41a3-a56d-a0e9a9fbc299)

- Mở từ icon ⚙ cạnh tên kênh. Hai tab: **Posting Schedule** · **General**.
- **Posting Schedule**:
  - **Time Zone** riêng từng kênh ("Time zone used for scheduling queue for this channel").
  - **Posting Goal**: số bài mục tiêu mỗi tuần, bộ đếm `− 1 +`. Đầu trang kênh hiện "Get a posting goal" hoặc "2/1 posts sent this week".
  - **Posting Slots**: bảng 7 cột Sunday–Saturday, mỗi cột toggle `On` và danh sách giờ. Giải thích ngay dưới tiêu đề: "the next 5 posts you add to your Queue will be sent in the next 5 upcoming time slots". Nút `Generate New Posting Slots ▾`. Dòng thêm giờ: "Add a new posting time for [Every Day ▾] at [06] [55] [PM]" + `Add Posting Slot`; `Clear All` (đỏ).
- **General**: Enable Notifications by default (toggle) · Link Shortening (ghi rõ "Instagram does not allow posting of shortened links") · **Bulk Post Upload** bằng CSV (ghi "early beta feature") · **Queue Actions**: Pause Queue (toggle), Shuffle Queue, Clean Queue (xoá bài lỗi), Delete All Drafts, Empty Queue. Hai nút xoá màu hồng; mỗi nút có câu giải thích hậu quả ("Posts pending approval will not be affected").
- Bấm Clean Queue → modal "Clean Queue?" nói rõ phạm vi ("All failed updates in your hello.asmith queue will be removed") → toast "Channel cleaned successfully".

#### B3. Trình soạn bài (Create Post)
[Publish](https://mobbin.com/flows/8673fbd7-5bdc-438b-90ed-1f161d05e82d) · màn: [composer + Instagram Preview](https://mobbin.com/screens/24370d2b-c8ce-46bc-9434-99c2c630c594) · [composer trống, 2 kênh](https://mobbin.com/screens/585dcc48-2ca9-4129-ac0c-63708ddc44df) · [Story lỗi](https://mobbin.com/screens/d6d390d2-9aa0-48a5-91ef-69142737f3c1)

- **Modal lớn chia đôi**: trái là trình soạn, phải là **preview theo mạng** ("Instagram Preview" ⓘ). Đầu modal: `Create Post` · `Tags ▾` · `Templates` · `AI Assistant` · `Preview` (bật/tắt cột preview) · phóng to ⤢ · đóng ✕.
- **Chọn kênh bằng hàng avatar** đầu trình soạn: avatar kênh kèm logo mạng ở góc, bấm để chọn/bỏ; kênh đang chọn có viền.
- Khi **chọn 2 kênh và chưa viết gì**: placeholder "Start writing or get inspired with [Templates]", preview trống ghi "**Post Previews** · See your post's preview here", nút chính đổi thành **`Customize for each network →`** thay cho Publish.
- **Khối theo mạng**: mỗi mạng một khối có icon mạng ở lề; với Instagram có radio **`Post · Reel · Story`**. Đổi sang Story thì trường đổi theo (Add Stickers: Text, Link, Music, Other; ô Link, Text) và preview đổi sang khung dọc kiểu Story.
- Trong khối: ô nội dung · ảnh dạng lưới thumbnail (mỗi ảnh có `ALT` để viết alt text, ✎ sửa, ✕ xoá) · ô "Drag & drop or select a file" · thanh công cụ (chèn media ▾, emoji, `#` hashtag, `AI Assistant`) · **bộ đếm ký tự còn lại** ở góc phải (1929, 2014…).
- Trường riêng của Instagram dưới thân bài: **Add Stickers** (`Music`, `Tag Products`) → mở thêm ô Music, Tag Products; **First Comment**; `Notify Me ▾` / `Automatic ▾` (đăng tự động hay nhắc đăng tay).
- **Preview** vẽ lại giao diện thật của Instagram: avatar + tên, carousel ảnh có chấm, hàng icon tim / bình luận / chia sẻ / lưu, caption bị cắt "… more", "View 1 comment" (khi có First Comment).
- **Lỗi đăng hiện ngay trong trình soạn**: dải đỏ trên đầu "An unknown error has occurred. Please retry the post again, and get in touch if this persists."
- Đáy: `☐ Create Another` · `Save Draft` · nút thời gian (`Now ▾` / `Next Available ▾`) · nút chính `Publish Now` / `Schedule Post`. Bản 2025 có thêm nhãn "When to Post" và nút chính có mũi tên ▾ phụ.
- Có **ô chọn nhóm / workspace** cạnh tiêu đề (`● Personal ▾`, bản cũ `● Trip to Bali ▾`).

#### B4. Lên lịch: Next Available, Prioritize, Now, giờ cụ thể
[Scheduling a post](https://mobbin.com/flows/498fa79c-afd4-4321-9ed3-fd41e0dc9891) (6 màn) · [Scheduling a post](https://mobbin.com/flows/75259d32-c222-4997-970c-a71c9538bfa2) (7 màn)

- Menu thời gian có 4 lựa chọn, mỗi lựa chọn một dòng mô tả:
  - **Next Available** ★ (mặc định): "Use the next available posting slot in your queue."
  - **Prioritize**: "Bump your post to the top of the queue."
  - **Now**: "Publish your post right away."
  - **Set Date and Time**: "Choose a specific time to post, or use our recommendation."
- Chọn giờ: lịch tháng + danh sách giờ cách 15 phút + ô giờ có **múi giờ ghi rõ** ("5:00 PM · Asia/Singapore", bản cũ "America/Los Angeles"); `More Posting Actions` / `Done`. Đã chọn thì nút hiện "📌 Jun 23, 5:00 PM ▾", bên cạnh có ✕ để bỏ.

#### B5. Queue, Drafts, Sent, Calendar
[Publish](https://mobbin.com/flows/b7ad2b81-7860-49af-b8a0-86506ef22a75) · [Switching to list view](https://mobbin.com/flows/4c133dff-48f6-4604-8f28-972c857bf18f) (6 màn)

- **List** gom bài theo ngày ("Today, June 23", "Yesterday, June 22"), cột trái là giờ, phải là thẻ bài. Thẻ: avatar + tên kênh · nội dung (hashtag thành link, "see more") · ảnh · tag màu (`Educate`) · dòng "You created this 1 day ago" · nút theo trạng thái (`Add to Queue` cho draft, `Reschedule` cho bài lỗi, `View Post` cho bài đã đăng) · ✎ · ⋮ · icon bình luận nội bộ 💬 bên ngoài thẻ.
- **Badge trạng thái** ở cột giờ: `Draft` (xanh), `Notify` (cam: đăng tay), `⚠ Sending…` (vàng). Draft không có giờ nằm trong nhóm **"Unscheduled · No time"**.
- **Queue trống của kênh**: dòng gợi ý "+ Great time to post! Create a new post or start with a template." kèm thẻ template minh hoạ ("Behind the Scenes"), dưới là `+ More Recommended Times`.
- **Sent**: thẻ có thêm dải số liệu ngay trên thẻ: Reactions · Comments · Eng. Rate · Views · Shares · Saves + nút biểu đồ; bản 2025 chỉ có "Link Clicks".
- **Calendar**: lưới tháng (`Month ▾`, `Today`, ‹ ›), mỗi bài là chip nhỏ có icon mạng + giờ + thumbnail; ngày nhiều bài thu gọn "⌄ 2 More". Chip bài lỗi nền hồng. Bấm chip mở **popover xem nhanh**: giờ + nhãn "Custom", nội dung, ảnh, số liệu (Reactions, Comments, Eng. Rate), `View Post`. Bộ lọc trên lịch: `All Posts ▾` · `Channels ▾` · `Tags ▾` · múi giờ.
- **Grid** (chỉ Instagram): lưới ảnh như profile Instagram; có trang "Shop Grid" gắn link sản phẩm cho từng bài.

#### B6. Ideas (kho ý tưởng) và AI Assistant
[Generating an idea with AI](https://mobbin.com/flows/53ac3897-e677-4bce-8bd7-a36f4d0e0596) (7 màn) · [Creating a description with AI](https://mobbin.com/flows/e5d00e57-201c-4587-8a55-c4826b934648) (11 màn)

- Trang **Create** có tab **Ideas · Templates · Feeds**.
  - **Ideas** dạng **kanban**: cột Unassigned · To Do · In Progress · Done (có đếm, `+`, ⋯), `+ New Group`; đổi `Board` / `Gallery`; nút `Generate Ideas` (AI). Cột đầu có thẻ hướng dẫn sẵn ("This is a place to plan your content", "Save inspirations you find online with one click" giới thiệu tiện ích trình duyệt).
  - **Feeds**: đọc RSS của các trang đã thêm (`Add Feed ▾`, chip nguồn, "Last refreshed about 6 hours ago" + nút làm mới), lấy cảm hứng để viết.
- **New Idea**: modal có tiêu đề, thân bài ("Ready, set, flow… or [Use the AI Assistant]"), media, `Unassigned ▾` (cột), `Tags ▾`; đáy `Create Post` · `Save Idea`. Ý tưởng chuyển thẳng thành bài.
- **AI Assistant là panel mở bên trái**, dính vào trình soạn (không thay nội dung trực tiếp):
  - Màn đầu: "How can I help with this post?" + `Write more` + các lệnh theo mạng **`Rephrase for Instagram` · `Shorten for Instagram` · `Expand for Instagram`**.
  - Write more: "What do you want to write about?" + ô nhập → kết quả trong khung tím, có copy, **`Retry`**, **`Insert`**; bên dưới chỉnh tiếp: `Rephrase` · `Shorten` · `Expand` · `More Casual` · `More Formal`.
  - Đáy panel: "AI responses can be inaccurate or misleading. Always review before publishing. Learn more."
- Bấm `Insert` thì nội dung vào ô soạn, preview cập nhật ngay.

#### B7. Analytics và Report
[Analytics](https://mobbin.com/flows/7ff85a82-a264-4191-862b-acaa60835864) · [Statistics](https://mobbin.com/flows/b400c01b-5de2-430f-b7a3-65bcf0bc737f) · màn: [Analytics home](https://mobbin.com/screens/a9f6c004-54f4-4207-81f3-9af9bfb93d8a)

- Chỉ thấy trạng thái trống. Home: "Good afternoon!" + "Want to share your data with your team? Create a Report by using the add button on a chart".
- Banner xanh **giải thích vì sao thiếu số liệu và cách sửa**: "Unlock Instagram Analytics for 'hello.asmith' · To access Instagram analytics, link your Instagram to a Facebook Page." + `Show Me How` / `Learn More`.
- Khối **Totals**: Total Audience · Total Impressions · Total Engagement (gộp mọi kênh), góc có `+` để đưa biểu đồ vào report. Khối **Recent posts** trống: "Aw, shucks! Seems to be no data for this date range".
- **Report**: modal "Add to a new report" (đặt tên + `Create Report`, hoặc thêm vào report có sẵn) → trang report: tiêu đề, khoảng ngày, "Add report summary", **Upload logo**, mỗi biểu đồ có "Add chart note"; thanh trên `This month · Jun 1 - 23, 2026 ▾` + **`Export as PDF`**.
- Số liệu từng bài nằm ngay ở tab Sent và popover lịch (B5), không bắt phải sang Analytics.

#### B8. Team, quyền theo kênh và duyệt bài
[Inviting a team member](https://mobbin.com/flows/cf782c67-c7a9-4748-88fb-fde27c190b1b) (5 màn) · [Inviting a team member](https://mobbin.com/flows/f395d136-91cf-4abc-b83b-795f5a4fc027) (4 màn)

- **Team Members**: thẻ toggle "Require Two-Factor Authentication · Every team member must have 2FA set up to use Buffer."; mỗi người một hàng: avatar, tên, badge `Owner` / `You` / `⚠ Pending 2FA`, email, **số kênh được giao** ("3 channels").
- **Invite Team Member** (modal): Email, Name, toggle **Admin** ("Can manage team members and organization settings"), **Channel Access**: mỗi kênh một dropdown quyền (thấy giá trị `No Access`), nút `Apply to All`; `Send Invite` → toast "Team member invited successfully".
- **Duyệt bài**: chỉ thấy tab `Approvals` (⚡ = gói trả phí) cạnh Queue / Drafts, và câu "Posts pending approval will not be affected" ở Delete All Drafts. Không thấy màn duyệt.

#### B9. Community (trả lời bình luận), Saved Replies, Channel Groups
[Adding a saved reply](https://mobbin.com/flows/02c1bd3e-32ef-409a-9fa9-ba56551f920c) · [Adding a channel group](https://mobbin.com/flows/1dd3b557-59ca-49e0-9380-f13cb7812404) · màn: [Community](https://mobbin.com/screens/ff02682b-e9b0-49e2-baee-c923aa867e60)

- **Community**: "All Channels" + badge đếm (60); xem `By post` / `List`; lọc `Channels ▾`, `All ▾`. Mỗi lượt hiện bài gốc thu gọn (kênh, giờ, nội dung, ảnh) rồi chuỗi bình luận và trả lời; điều hướng `1/1` ↑ ↓ giữa các bài, thanh tiến độ trên đầu.
- **Saved Replies** (mẫu trả lời dùng chung): "Saved Replies are visible to everyone in your organization."; trống có icon + `+ New Saved Reply`; form tiêu đề + nội dung + đếm "132/1000".
- **Channel Groups**: gom kênh hay dùng chung để chọn nhanh khi soạn bài ("Group your frequently used channels together to save time when creating content."). Modal: Name + danh sách kênh có checkbox.

#### B10. Onboarding
[Onboarding](https://mobbin.com/flows/f018a348-ce88-40ed-8e74-fa372ac7c380) (20 màn) · [Onboarding](https://mobbin.com/flows/1561aa24-0193-4d5a-916c-dc8b6a1a4023) (9 màn)

- Landing có **trình soạn thử ngay trên trang** ("Give it a try!", hàng icon 11 mạng, "or try a sample post").
- Đăng ký: Email + Password, **checklist mật khẩu tick xanh từng điều kiện** (8 ký tự, 1 chữ hoa, 1 số/ký hiệu); cột phải là quảng cáo API (2026) hoặc lời chứng thực khách (2025).
- Câu hỏi khảo sát, có chấm tiến độ trên đầu, `Continue →` + `Skip`, góc phải có nút sáng/tối:
  - "What tools do you use to manage your social media?" (None – I post directly · Meta Business Suite · công cụ quản lý khác · công cụ cho một mạng · AI Platforms ChatGPT/Claude · Other).
  - "What social channel(s) are in focus?": lưới 11 thẻ có logo (Instagram, Facebook, Twitter / X, LinkedIn, TikTok, YouTube, Pinterest, Threads, Bluesky, Mastodon, Google Business), chọn nhiều.
- Kết thúc vào thẳng Publish / Calendar trống; tiến độ còn lại nằm ở thẻ "0/3 channels connected" cuối sidebar.

### 8.3 Danh mục pattern

| # | Pattern | Buffer dùng ở | Đánh giá cho Saella |
|---|---|---|---|
| B-P1 | Sidebar tách "Channels" (đã nối, có đếm) và "Connect channels" (chưa nối, bấm là nối) | Sidebar | **Nên học**. Kết nối kênh luôn trong tầm tay, không phải vào Settings |
| B-P2 | Thẻ tiến độ "1/3 channels connected" cuối sidebar, đóng được | Sidebar | **Nên học** cho onboarding module social |
| B-P3 | Màn cấp quyền liệt kê từng quyền; nhánh riêng khi loại tài khoản không cho đăng tự động (Notify Me) | Kết nối Instagram | **Nên học**. Saella cần nói rõ kênh nào đăng tự động được, kênh nào phải đăng tay |
| B-P4 | Composer chia đôi: soạn bên trái, preview theo mạng bên phải, bật/tắt preview | Create Post | **Nên học**. Lõi của màn soạn bài |
| B-P5 | Chọn kênh bằng hàng avatar có logo mạng ở góc | Create Post | **Nên học** |
| B-P6 | Viết chung một lần, rồi nút "Customize for each network" mở bản riêng từng mạng | Create Post | **Nên học**. Chưa thấy màn sau khi bấm, cần tra thêm |
| B-P7 | Khối theo mạng: chọn định dạng (Post / Reel / Story), trường riêng (First Comment, Music, Tag Products), đếm ký tự còn lại | Create Post | **Nên học**. Mỗi mạng của Saella có định dạng riêng (Reels, Shorts, Threads…) |
| B-P8 | Preview vẽ lại giao diện thật của mạng, đổi khung theo định dạng (Story dọc) | Instagram Preview | **Nên học** |
| B-P9 | Lỗi đăng hiện ngay trong trình soạn và chip lịch đổi màu hồng; nút `Reschedule` trên thẻ lỗi | Composer, Calendar, List | **Nên học** |
| B-P10 | 4 kiểu thời gian có mô tả: Next Available / Prioritize / Now / Set Date and Time | Nút lên lịch | **Nên học**. Đơn giản hoá quyết định "đăng lúc nào" |
| B-P11 | Khung giờ đăng (Posting Slots) theo tuần + mục tiêu số bài/tuần + múi giờ riêng từng kênh | Channel settings | **Nên học**. Saella phủ 7 nước, lệch múi giờ |
| B-P12 | Tab Queue / Drafts / Approvals / Sent có đếm; đổi List / Calendar / Grid | Publish | **Nên học** |
| B-P13 | List gom theo ngày, badge trạng thái (Draft, Notify, Sending…), nhóm "Unscheduled" | Publish › List | **Nên học** |
| B-P14 | Calendar tháng: chip có icon mạng + giờ + thumbnail, "2 More", popover xem nhanh kèm số liệu | Calendar | **Nên học** |
| B-P15 | Số liệu bài (Reactions, Comments, Eng. Rate, Views…) ngay trên thẻ bài đã đăng | Sent | **Nên học**. Không bắt sang trang Analytics |
| B-P16 | Queue trống gợi ý giờ tốt + template ("Great time to post!") | Queue kênh | Nên học |
| B-P17 | AI Assistant là panel cạnh trình soạn: lệnh theo mạng (Rephrase for Instagram), kết quả trong khung riêng, Retry / Insert, chỉnh giọng | AI Assistant | **Nên học**. Khớp nguyên tắc "AI đề xuất, người dùng chèn" của agent Saella |
| B-P18 | Dòng cảnh báo AI cố định ở đáy panel ("Always review before publishing") | AI Assistant | Nên học |
| B-P19 | Kho ý tưởng dạng kanban, ý tưởng → `Create Post` | Create › Ideas | Nên học khi có AI tạo bài |
| B-P20 | Feeds RSS để lấy cảm hứng | Create › Feeds | Tham khảo |
| B-P21 | Banner analytics giải thích vì sao thiếu số liệu + `Show Me How` | Analytics | **Nên học**. Meta/TikTok hay đòi điều kiện mới cho xem insight |
| B-P22 | Report tự dựng: thêm biểu đồ vào report, ghi chú từng biểu đồ, logo, Export as PDF | Analytics › Reports | Nên học |
| B-P23 | Mời thành viên với quyền theo từng kênh + `Apply to All` | Invite Team Member | **Nên học**. Agency/doanh nghiệp nhiều page cần |
| B-P24 | Bắt buộc 2FA cho cả team, badge "Pending 2FA" | Team Members | Tham khảo |
| B-P25 | Hành động phá huỷ có câu giải thích phạm vi + modal xác nhận + toast | Queue Actions | Nên học |
| B-P26 | Channel Groups: gom kênh để chọn nhanh khi soạn | Settings | Nên học |
| B-P27 | Saved Replies dùng chung cho cả tổ chức | Community | Tham khảo. Saella chưa có hộp bình luận |
| B-P28 | Onboarding hỏi "kênh nào là trọng tâm" bằng lưới logo chọn nhiều | Onboarding | **Nên học** |
| B-P29 | Analytics tách thành app riêng ("Back to Main App") | Analytics | Không hợp. Saella nên giữ trong AppShell |
| B-P30 | Bulk Post Upload bằng CSV | Channel settings | Tham khảo |

### 8.4 Chức năng đáng cân nhắc cho Saella

Chỉ là ý tưởng; muốn làm phải đối chiếu PRD và hỏi team.

1. **Khung giờ đăng theo kênh** + "Next Available": người dùng (hoặc agent) chỉ cần thêm bài vào hàng đợi, không phải chọn giờ từng bài.
2. **Mục tiêu đăng mỗi tuần** theo kênh ("2/1 posts sent this week").
3. **Kênh đăng tay (Notify Me)** cho loại tài khoản mạng không cho API đăng; nhắc người dùng đúng giờ.
4. **Quyền theo kênh** khi mời thành viên; tab **Approvals** để bài của người không có quyền đăng phải chờ duyệt. Hợp với nguyên tắc agent của Saella: bài do agent soạn cũng vào hàng chờ duyệt.
5. **Lệnh AI theo mạng**: "Rephrase for LinkedIn", "Shorten for Threads"… thay vì một nút AI chung.
6. **Kho ý tưởng** nối thẳng sang soạn bài; nơi chứa bài nháp do AI tạo trước khi lên lịch.
7. **Report xuất PDF** có logo và ghi chú, gửi khách hàng / sếp.
8. **Channel Groups**: nhóm page theo thương hiệu hoặc theo nước.
9. **Hộp bình luận gộp** (Community) + mẫu trả lời: chỉ khi PRD mở rộng sang trả lời bình luận.

### 8.5 Không nên học

- **Analytics là app riêng**, đổi sidebar và có "Back to Main App": người dùng mất ngữ cảnh. Saella giữ analytics trong cùng AppShell.
- **Hai thanh điều hướng song song** ở bản 2025 (menu ngang trên + cột kênh bên trái): rối; bản 2026 đã gộp về một sidebar.
- **Tính năng trả phí chỉ đánh dấu bằng icon tia sét** (Approvals, Channel Groups, Invite a Team Member) không có chữ: người mới không hiểu.
- **Bộ đếm ký tự chỉ là con số trần** (1929) không có nhãn hay giới hạn: khó hiểu với người không quen.
- Start Page (link-in-bio), Shop Grid, Feeds RSS: ngoài phạm vi PRD Saella.
- Upsell dày: banner "You have 14 days left on your free trial" chiếm cả dải trên mọi trang.

### 8.6 Gợi ý áp vào Saella

Module social chưa có màn trong bản thiết kế mới. Gợi ý cho các màn social tương lai:

| Màn social (tương lai) | Lấy từ Buffer |
|---|---|
| Khung module + kết nối kênh | B-P1, B-P2, B-P3, B-P28; trạng thái trống "Connect a channel to start…" |
| Trình soạn bài nhiều mạng | B-P4, B-P5, B-P6, B-P7, B-P8, B-P9; ý tưởng 5 |
| Lên lịch / hàng đợi | B-P10, B-P11, B-P16; ý tưởng 1, 2, 3 |
| Lịch nội dung (Calendar / List) | B-P12, B-P13, B-P14, B-P15 |
| AI tạo bài / panel agent trong composer | B-P17, B-P18, B-P19; ý tưởng 6. Agent đề xuất trong panel riêng, người dùng bấm Insert / duyệt mới vào bài |
| Analytics social | B-P15, B-P21, B-P22; ý tưởng 7. Không tách app riêng (B-P29) |
| Team và duyệt bài | B-P23, B-P25, B-P26; ý tưởng 4, 8 |
