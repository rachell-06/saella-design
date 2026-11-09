# Saella Platform UI

Thiết kế lại **toàn bộ giao diện app Saella** (không phải landing page) và dựng **design system** cho platform từ đầu. Đầu ra là **app Next.js + shadcn/ui** chạy localhost (chốt 2026-10-26, thay cho HTML tĩnh: DS là code dùng được luôn).

## Thư mục (sắp xếp 2026-10-27 cho người không làm code)

```
01 Docs/           Competitor.md (tham khảo) + Design system/ (DESIGN.md, decisions.md)
03 Brand/          logo, tài sản brand
code/              toàn bộ app Next.js (chạy lệnh npm trong thư mục này)

Tên file/thư mục đặt bằng tiếng Anh (chốt 2026-10-27); nội dung docs viết tiếng Việt.
```

Không để file kỹ thuật ở gốc. File mới phải vào đúng một trong các thư mục trên; việc chờ duyệt ghi vào mục "Chưa chốt" đầu `01 Docs/Design system/decisions.md` (chốt 2026-11-02, bỏ `00 Start here.md`).

- App thật (`github.com/Phong-Gia-Group/saella-platform`, bản clone ở `D:\Workspace\Saella\Repo`, chỉ đọc để tham khảo chức năng) đang dùng Next 14 + antd 5. DS mới sẽ thay antd; người dùng tự quyết, không cần chờ team.
- Không chạy `shadcn apply` / `init --preset`: preset ghi `:root`/`.dark` vào `globals.css` và đè token Saella. Đổi màu/font chỉ sửa `code/src/styles/tokens.css`.
- Dùng skill `shadcn` khi thêm/sửa component; Studio Admin (`arhamkhnz/next-shadcn-admin-dashboard`, clone ở `D:\Workspace\Saella\Studio Admin`, chỉ đọc) và bản thử `D:\Workspace\internal-data-hub\design\shadcn-app` chỉ để tham khảo, không làm nền. Học **pattern**, dựng lại bằng component + token Saella; không chép CSS/preset màu/`components/ui/` của họ (đã áp ở đợt 4, 2026-10-27).
- Màn sản phẩm mới đặt trong `code/src/app/(app)/<màn>/` (dùng chung `AppShell`, đầu trang dùng `PageHeader`); component chỉ dùng cho một màn đặt ở `(app)/<màn>/_components/`. Màn không import `_components/` của màn khác: thứ dùng từ hai màn trở lên đưa lên `components/saella/`, dữ liệu giả và kiểu dữ liệu dùng chung ở `code/src/lib/mock/`, hàm định dạng ở `lib/format.ts` (chốt 2026-11-09).

Landing page là project riêng ở `D:\Workspace\Saella\Saella LP`. Quy tắc trong CLAUDE.md của LP **không áp** ở đây, trừ phần brand ghi bên dưới.

## Đọc trước khi làm

1. PRD Master (https://pgg-prd-lib.vercel.app/docs/saella-prd-master), do team dev viết và cập nhật mỗi version: tổng quan sản phẩm, tab Upcoming. Cần chi tiết màn hình thì tra thẳng PRD từng module, không đoán. (Bản chép `Product brief.md` đã bỏ ngày 2026-11-02 vì cũ, v1.5.9.)
2. `01 Docs/Design system/DESIGN.md` (quy tắc, màu, chữ, component, pattern) và `decisions.md` (khác gì app hiện tại, việc chờ duyệt). Giá trị token chỉ nằm ở `code/src/styles/tokens.css`. Mọi màn phải dùng token, không tự đặt màu/cỡ chữ.

## Dùng chung với LP

- Brand: primary `#BF6603`, ink `#0C2124`, font Geist, logo `03 Brand/saella-mark.png`.
- Brand character (cô gái chibi, búi tóc trái tim): mô tả ở `Saella LP/docs/visual-direction.md` mục 9; file PNG (tư thế vẫy tay `wave`, giơ hai tay `cheer`) ở `03 Brand/saella-character-*`, xuất từ `Saella LP/src/components/ui/Chibi.tsx` ngày 2026-10-27. Trong app bản toàn thân **chỉ dùng ở màn onboarding** (chốt 2026-10-27); màn trống dùng icon, không dùng nhân vật. Agent dùng bản thu gọn **Saella mini** (`components/saella/saella-mini.tsx`, `03 Brand/saella-mini-*.png`, chốt 2026-10-28; đang chờ chọn kiểu).
- Ảnh chụp UI hiện tại người dùng đã gửi khi làm LP: Contacts, Automate (Schedule, Follow-up), Email metrics, trình soạn template + Write with AI, panel chat assistant.

## Khác với LP

- Tên trong UI: **agent** (chốt 2026-10-27, theo PRD: "Ask the agent…"). Không dùng "assistant".
- Dark mode: **có làm** (chốt 2026-10-27). Mọi token phải có cặp light/dark trong `tokens.css`, dark cũng phải đạt WCAG AA.
- Số liệu trong mock là dữ liệu minh hoạ, không phải claim marketing. Tên công ty/người trong mock phải hư cấu, không dùng khách thật (FTK, Vinex, VMA, Exquee, Aegis).

## Quy trình bắt buộc khi gen UI (chốt 2026-10-28, sau nhiều lỗi phải sửa lại)

Làm đúng thứ tự, không bỏ bước:

1. **Component lấy từ shadcn.** Dùng component có sẵn trong `code/src/components/ui/` hoặc `components/saella/` (ghép từ shadcn). Component có file `<tên>.meta.ts` cạnh nó thì đọc trước khi dùng (khi nào dùng biến thể nào, tổ hợp cấm); component mới hoặc hay bị dùng sai thì viết thêm meta theo khuôn `components/meta.ts` (chốt 2026-11-09). Thiếu thì thêm bằng `npx shadcn@latest add`, không tự vẽ control. Không dùng control native của trình duyệt: không `<input type="date|time">` (dùng `DatePicker`, `DateRangePicker`, `TimePicker` ở `components/saella/date-picker.tsx`), không `<select>` thô.
2. **Tuân theo design system Saella.** Màu, chữ, bo góc chỉ lấy từ token trong `tokens.css`; đọc `DESIGN.md` mục 2 "Quy tắc đã chốt" trước khi làm vì có nhiều quy tắc người dùng đã chốt, tóm tắt: không nền hiệu ứng / bóng đổ trên thẻ danh sách, không đổi nền khi rê chuột dòng bảng, thông tin phụ vào ⓘ hoặc tooltip, không chú thích phương pháp cuối trang, mỗi trang một nút cam đặc, tỉ lệ % chỉ hiện số (bỏ thang 3 nấc 2026-11-03), chỉ Bounce và Delivery được tô màu theo ngưỡng của app thật trong `RATE_BANDS` (`components/saella/rate-meter.tsx`, chốt 2026-11-05), mọi giờ hiện theo GMT+7 (`src/lib/time.ts`).
3. **Học pattern từ Studio Admin**: bản clone chỉ đọc ở `D:\Workspace\Saella\Studio Admin` (clone 2026-10-28, commit `89f28da`; cập nhật bằng `git -C "D:\Workspace\Saella\Studio Admin" pull`), các trang ở `src/app/(main)/dashboard/<trang>/`; demo https://studio-admin.arhamkhnz.com. Mở đúng trang tương ứng, đọc `page.tsx` + `_components/*` để lấy bố cục, spacing, cấu trúc; dựng lại bằng component + token Saella. Không chép CSS, màu, `components/ui/` của họ. Khi khác quyết định Saella thì Saella thắng.
4. **Sau đó mới gen UI**, rồi tự kiểm tra trước khi báo xong (mục "Kiểm tra trước khi báo xong").

Lỗi đã gặp, không lặp lại:
- Ô chọn ngày/giờ native của trình duyệt (không phải shadcn).
- Giới hạn bề rộng cả thanh header làm vạch kẻ hụt cạnh sidebar: chỉ giới hạn phần bên trong, thanh và vạch kẻ trải hết bề ngang.
- Thanh progress không khớp con số (so với "dòng tốt nhất", để rỗng khi ít dữ liệu). Tỉ lệ email chỉ hiện số; nơi nào còn dùng thanh Progress thì thanh luôn = đúng con số.
- Ngưỡng màu khác nhau giữa các cột cùng loại: mọi tỉ lệ tốt dùng chung một bộ ngưỡng, Bounce và Unsub (tỉ lệ xấu) dùng chung một bộ riêng.
- Badge/chữ lẫn lộn trong cùng một cột (vd. Recent batches): một cột chỉ một kiểu hiển thị.
- Dòng phụ quá dài bị cắt, cột tên bị bóp khi thêm cột: chụp lại và đo trước khi báo xong.
- Hiển thị giờ theo UTC; dữ liệu mẫu không đủ để hiện trạng thái cần duyệt (cho dữ liệu giả đủ để "show UI").
- Server dev giữ module cũ gây lỗi hydration: khởi động lại `npm run dev` rồi kiểm tra lại, không đoán.

## Quy tắc làm việc

- Dùng skill `interface-design` (app/dashboard), không dùng `frontend-design` (dành cho marketing).
- Tra pattern UI qua MCP `mobbin` / `ui-skills`; ghi ref vào `01 Docs/Design system/DESIGN.md` mục 11 Tham chiếu.
- Dựng design system trước, màn hình sau. Mỗi component mới phải có đủ trạng thái (default, hover, focus, disabled, loading, empty, error).
- Chữ: body ≥ 14px trong app (bảng dày có thể 13px), WCAG AA.
- Không bóng đổ (shadow) cho nền, card, khung, bảng trong trang (chốt 2026-10-29): tách lớp bằng viền hairline. Bóng chỉ dành cho phần tử nổi lên trên trang (popover, menu, toast, dialog, sheet, nút nổi), theo `DESIGN.md`.
- Ghi vào docs, không ghi vào chat (chốt 2026-11-02, docs gọn): quy tắc thiết kế mới vào `DESIGN.md` (gộp foundations, components, patterns ngày 2026-11-02); `decisions.md` chỉ ghi **thay đổi lớn so với app hiện tại** (Repo), mỗi thay đổi một dòng, và mục "Chưa chốt". Không ghi nhật ký quy trình (dọn file, sửa lỗi nhỏ).

## Kiểm tra trước khi báo xong

- Một server: `npm run dev` = sản phẩm ở localhost:3000. Trang Design system (localhost:3001, `npm run dev:ds`) đã bỏ ngày 2026-11-02; quy tắc DS nằm ở `01 Docs/Design system/`, component xem trực tiếp trên các màn sản phẩm.
- Chạy app (trong `code/`), chụp 1440px bằng `node scripts/screenshot.mjs <url> <width> "<thư mục tạm của phiên>/<trang>-<width>.png"` (exit 1 nếu cuộn ngang), và bản tối: thêm tham số `dark`, tên file `<trang>-<width>-dark.png`. Chạy lần lượt, không song song (cùng port debug). Ảnh chụp vào thư mục tạm để tự kiểm tra, không lưu vào project (chốt 2026-11-02, bỏ thư mục `02 Screenshots/`). Không dùng `chrome --window-size` để chụp mobile: trên Windows cửa sổ không hẹp dưới ~500px.
- Typecheck sạch, không lỗi console.
- Mobile: **tạm hoãn** (chốt 2026-10-27). Chỉ thiết kế và kiểm tra desktop; không chụp 390px, không đề xuất thiết kế mobile. Giữ class responsive sẵn có, không cố gỡ.
