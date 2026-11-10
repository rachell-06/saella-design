# Saella Platform UI

Thiết kế lại toàn bộ giao diện app Saella (không phải landing page) và dựng design system cho nó. Đầu ra là app **Next.js + shadcn/ui** chạy ở localhost, trong `code/`. File này là **bản đồ**: nói tài liệu nào chứa gì và làm theo thứ tự nào. Quy tắc thiết kế không ghi ở đây.

## Tài liệu: mỗi thứ một nơi

| Câu hỏi | Nguồn duy nhất |
|---|---|
| Sản phẩm cho ai, để làm gì, nguyên tắc thiết kế (vì sao) | `01 Docs/PRODUCT.md` |
| Quy tắc giao diện nền: quy tắc đã chốt, token, màu, chữ, component (làm thế nào) | `01 Docs/Design system/DESIGN.md`. Đọc mục 2 và bảng "Tra nhanh" ở đầu file trước mỗi việc |
| Pattern theo bài toán: bảng, form, số liệu, phản hồi, quyền, chữ trên màn | `01 Docs/Design system/PATTERNS.md` (mục 9.1–9.15). Chỉ đọc mục bảng "Tra nhanh" trỏ tới |
| Giá trị màu, chữ, bo góc, bóng | `code/src/styles/tokens.css` |
| Cách dùng một component | File `<tên>.meta.ts` cạnh component (khuôn: `code/src/components/meta.ts`) |
| Việc chưa chốt; khác gì app hiện tại | `01 Docs/Design system/decisions.md`. Mục "Chưa chốt" **chưa có hiệu lực** |
| Nghiệp vụ, chi tiết từng màn | PRD Master https://pgg-prd-lib.vercel.app/docs/saella-prd-master và PRD từng module. Không đoán |
| Nghiên cứu đối thủ | `01 Docs/Research/Competitor.md`. Tài liệu lớn: chỉ đọc mục cần, không đọc cả file |

Khi các nguồn nói khác nhau: **CLAUDE.md > DESIGN.md > PRODUCT.md > skill** (impeccable, interface-design…) **> tham chiếu ngoài** (Mobbin, đối thủ). Skill bảo đổi font, thêm màu hay "bold direction" trái DS thì theo DS. **Riêng Studio Admin** chia theo việc: bố cục và cách thể hiện element theo Studio Admin; màu, font, bo góc và logic số liệu theo DESIGN.md (bước 4).

## Thư mục

```
01 Docs/            PRODUCT.md · Design system/ (DESIGN.md, PATTERNS.md, decisions.md) · Research/ (nghiên cứu, ghi chú)
03 Brand/           logo, nhân vật chibi, Saella mini
code/               app Next.js; chạy lệnh npm trong thư mục này
```

- Tên file và thư mục bằng tiếng Anh; nội dung docs tiếng Việt, riêng `PRODUCT.md` tiếng Anh (để skill đọc được).
- Không để file kỹ thuật ở gốc. Cấu trúc bên trong `code/src/` (màn, component, mock data): `DESIGN.md` mục 8.

## Nguồn bên ngoài (chỉ đọc, không sửa)

- **App hiện tại:** `D:\Workspace\Saella\Repo` (`github.com/Phong-Gia-Group/saella-platform`, Next 14 + antd 5). Đọc để hiểu chức năng; DS mới thay antd, người dùng tự quyết không cần chờ team. Không mở file `.env*`.
- **Studio Admin:** `D:\Workspace\Saella\Studio Admin` (cập nhật: `git -C "D:\Workspace\Saella\Studio Admin" pull`), trang ở `src/app/(main)/dashboard/<trang>/`, demo https://studio-admin.arhamkhnz.com. Được chép `page.tsx` + `_components/` của màn mẫu (cách làm: bước 4 dưới). Không chép `components/ui/` (shadcn nguyên bản, thiếu thì `add`), `globals.css`, theme preset. Không lấy màn `(legacy)` làm mẫu.
- **Landing page:** `D:\Workspace\Saella\Saella LP`. Chỉ dùng chung brand (màu gốc, font Geist, logo, nhân vật: mô tả ở `docs/visual-direction.md` mục 9). Quy tắc khác trong CLAUDE.md của LP **không áp** ở đây.

## Quy trình khi dựng hoặc sửa màn

1. **Hiểu màn:** đọc PRD module và code màn đó trong Repo để biết nó hoạt động thế nào. Đây là để hiểu, **không phải danh sách thứ cần hiện** lên màn (`PATTERNS.md` mục 9.15).
2. **Đọc quy tắc:** `DESIGN.md` mục 2 + các mục bảng "Tra nhanh" trỏ tới; `*.meta.ts` của component sẽ dùng.
3. **Lấy component** từ `code/src/components/ui/`, `components/saella/`, hoặc component của Studio Admin (`_components/` của màn mẫu, không lấy `components/ui/` của nó), rồi tuỳ chỉnh thành component Saella (token, `DESIGN.md`). Thiếu thì `npx shadcn@latest add` (dùng skill `shadcn`), không tự vẽ control. Không chạy `shadcn apply` hay `init --preset`: chúng ghi đè token Saella.
4. **Lấy bố cục và cách thể hiện** từ trang tương ứng của Studio Admin: chép `page.tsx` + `_components/` vào màn Saella và **giữ nguyên cách thể hiện element** (thẻ KPI, bảng, toolbar, bộ lọc, badge, tabs, biểu đồ…). Chỉ đổi: (a) màu viết cứng (`text-green-500`, `bg-amber-100`…) sang token Saella; (b) nhận diện theo `DESIGN.md`: màu, font, bo góc; (c) dữ liệu, cột, hành động theo PRD; (d) logic số liệu theo `DESIGN.md` mục 2 và `PATTERNS.md` 9.7 (cách tính tỉ lệ, ngưỡng tô màu, ô trống). Phần Studio Admin không có mẫu thì theo `DESIGN.md` và `PATTERNS.md`.
5. **Dựng**, rồi kiểm tra theo `DESIGN.md` mục 10, gồm lượt cắt gọt chữ. Chưa đạt thì chưa báo xong.

Skill thiết kế: dùng `interface-design` (app, dashboard), không dùng `frontend-design` (marketing). Tra pattern qua MCP `mobbin`; nguồn đáng giữ ghi vào `DESIGN.md` mục 11.

## Chạy và chụp màn

- Trong `code/`: `npm run dev` → localhost:3000. Lỗi hydration hoặc giao diện cũ sau khi sửa nhiều file: khởi động lại `npm run dev` rồi kiểm lại, không đoán.
- Chụp: `node scripts/screenshot.mjs <url> 1440 "<thư mục tạm>/<trang>-1440.png"`, thêm tham số `dark` cho bản tối (`<trang>-1440-dark.png`). Exit 1 nghĩa là có cuộn ngang. Chạy lần lượt, không song song. Ảnh để vào thư mục tạm của phiên, không lưu vào project.
- `npm run typecheck`, `npm run lint` sạch; console không lỗi.
- Chỉ thiết kế và kiểm tra desktop. Mobile tạm hoãn: không chụp 390px, không đề xuất thiết kế mobile, giữ nguyên class responsive sẵn có.

## Ghi chép

- Ghi vào docs, không chỉ nói trong chat. Quy tắc thiết kế mới → `DESIGN.md`, pattern mới → `PATTERNS.md` (đánh số tiếp, không đánh số lại vì code trích dẫn số mục). Việc chờ duyệt → `decisions.md` "Chưa chốt", đúng nhóm. Thay đổi lớn so với app hiện tại → `decisions.md`, một dòng mỗi thay đổi.
- Không ghi nhật ký quy trình (dọn file, sửa lỗi nhỏ, ngày bỏ cái gì): git đã lưu.
