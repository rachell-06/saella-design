# Tóm tắt video: Don't Build a Design System from Scratch (Advanced Claude Code + Figma Workflow)

- **Link:** https://www.youtube.com/watch?v=B7xXKTfBxhE
- **Nguồn tóm tắt:** phụ đề tự động tiếng Anh của YouTube (~3.300 từ), Claude đọc và tóm tắt ngày 2026-11-06.
- **Lưu ý:** đây là ghi chú tham khảo, **không phải quy tắc của Saella**. Quy tắc Saella nằm ở `Design system/DESIGN.md`.

## 1. Vấn đề video đặt ra

Khi nhờ AI (Claude Code) dựng một màn hình, AI tự "bịa" ra component lạ, khác với component team đang dùng ở chỗ khác trong sản phẩm. Theo tác giả, đó là dấu hiệu **design system không được viết để AI hiểu**, cần nâng cấp.

## 2. Năm dấu hiệu nên làm lại design system

Gặp từ 3/5 dấu hiệu trở lên thì nên làm lại:

1. **Một component sống ở nhiều nơi, lệch nhau:** Figma một kiểu, code một kiểu, Storybook một kiểu, Notion ghi thay đổi một kiểu. Không có nguồn sự thật duy nhất.
2. **AI tạo component chưa từng thấy** khi được nhờ dựng trang.
3. **Sản phẩm trông cũ**, team thấy ngại về giao diện.
4. **Token rải rác:** mã màu hex viết cứng trong CSS thay vì dùng token có tên (vd. `black-300`). AI khó dựng đúng khi không có token.
5. **Người mới hỏi mãi "dùng nút nào?"**, quy tắc thay đổi hằng tuần.

## 3. Vì sao chọn shadcn làm nền

- Miễn phí, mã nguồn mở, không phải quản lý giấy phép.
- **Tuỳ biến được hoàn toàn:** áp style, brand, file `design.md` của mình lên. Lý do "web nào cũng giống shadcn" là vì người ta để nguyên mặc định, không tuỳ biến.
- Luôn được cập nhật, có thể kéo bản mới về từng component.
- Là design system có nhiều tài liệu nhất, nên **AI hiểu shadcn rất tốt**.

## 4. Quy trình dựng (demo trong video)

### Bước 1: Làm ở nhánh riêng, package riêng
- Tạo nhánh git mới (vd. `shadcn-design-system`).
- Tạo một **package anh em** (sibling package) cạnh bộ component cũ, đặt tên `ui-next` (nghĩa là "bộ UI tiếp theo"). Bộ mới được dựng hoàn toàn trong đó, không đụng tới component đang chạy.
- Giải thích rõ cho Claude **vì sao** tạo package riêng, để nó hiểu mục tiêu: dựng xong rồi cùng team dev tính cách chuyển sang.

### Bước 2: Cài shadcn
- Câu lệnh nhờ Claude: "install shadcn here with all base components" (cài shadcn kèm đủ component cơ bản).

### Bước 3: Gắn brand bằng `design.md`
- `design.md` là file mô tả brand cho AI: màu, font, kiểu chữ, bo góc, khoảng cách. Tác giả nói đây là khái niệm đang phổ biến (có nhắc Google tài trợ) và hứa làm video riêng.
- Câu lệnh nhờ Claude: "read the design.md and apply everything defined there to any of these shadcn components".
- Chưa có `design.md`? Hỏi Claude "brand và giao diện hiện tại trông thế nào?" (dùng plan mode), vì codebase thường đã có sẵn nguồn token.
- Trong `CLAUDE.md` ghi: **trước khi dựng bất cứ thứ gì, đọc design.md**.
- Tạo thêm `AGENTS.md` cùng nội dung, vì `CLAUDE.md` chỉ Claude đọc, các công cụ AI khác (Cursor, Codex…) đọc `AGENTS.md`. Trong demo, Claude tự tạo `AGENTS.md` tóm design.md thành các quy tắc hành động được.
- Mẹo: bật **auto mode** (Shift+Tab) để Claude chỉ hỏi ở điểm quan trọng, chạy nhanh hơn. Tác giả nói lúc đầu nên để nó hỏi nhiều vì học được nhiều.

### Bước 4: Mỗi component có file meta (ý chính của video)
- "Meta schema" là phần mô tả component **bằng ngôn ngữ AI hiểu**: dùng khi nào, liên quan component nào.
- Ví dụ: nhờ AI dựng "modal xoá", AI sẽ biết dùng nút destructive vì meta của nút destructive ghi "dùng khi có hành động phá huỷ". AI không phải tìm hay tự đoán.
- Schema gồm:
  - **Loại** (category): atom, molecule hay organism.
  - **Mô tả** (description).
  - **Props và biến thể** (variants), kể cả **tổ hợp không hợp lệ**.
  - **Quan hệ** (relationships) với component khác.
  - **Token** dùng: màu, khoảng cách, chữ.
  - **Gợi ý cho AI** (AI hints).
- Ghi vào `AGENTS.md`: **mỗi component phải đi kèm `meta.ts`**, kiểm lại mỗi khi sửa component.
- Về sau nên đóng gói thành một **skill**: mỗi lần dựng component thì tự đọc design.md và tạo meta.ts.

### Bước 5: Bắt đầu từ Button, xem trên Storybook
- Chọn component dùng nhiều nhất để làm trước. Có thể nhờ Claude rà xem component nào dùng nhiều nhất trong sản phẩm. Demo chọn Button.
- Câu lệnh: "Use Context7 to pull current shadcn and Storybook docs. Scaffold Storybook, start with Button as the first story. Read the design.md and output the attached schema."
- **Context7** là plugin giúp Claude lấy tài liệu mới nhất của thư viện mã nguồn mở mà không cần dán link.
- Kết quả: Button trên Storybook với đủ size, trạng thái disabled, error, các biến thể.

### Bước 6: Hiện meta trên Storybook
- Nhờ Claude thêm cho mỗi component một **tab Metadata** trên Storybook, hiện props, boolean, size, biến thể, **khi nào dùng từng loại**, tổ hợp không hợp lệ. Ví dụ: "Primary CTA", "size small: nút gọn cho dòng bảng".
- Mục đích: người thiết kế kiểm tra meta có rõ và đúng không, rồi sửa qua lại với Claude. Meta càng rõ thì AI càng làm đúng ngay lần đầu thay vì lần thứ 10.

## 5. Làm việc với team dev

Tác giả nhấn mạnh: video chỉ ở mức tổng quan, **đừng làm một mình** rồi mới đưa cho dev. Họp với dev sớm, mang theo 3 thứ:

1. **Kết quả rà soát:** vì sao cần làm lại, muốn làm gì.
2. **Khoảng 5 component** muốn làm và thử trên Storybook. Đảm bảo dev hiểu shadcn và đồng ý.
3. **Câu hỏi:** cách nào đưa component mới vào sản phẩm **ít rủi ro nhất**? Để dev đề xuất kế hoạch.

Mục tiêu: bộ component mới khớp với cách công ty và team sản phẩm đang vận hành, giúp team ra sản phẩm nhanh hơn nhờ AI.

## 6. Tóm tắt một dòng

Dựng design system mới trên shadcn, ở chỗ riêng không đụng code cũ. Gắn brand bằng `design.md`, ghi cho AI biết trong `CLAUDE.md`/`AGENTS.md`. Mỗi component có `meta.ts` mô tả cách dùng cho AI. Xem và kiểm tra trên Storybook. Thống nhất với dev từ sớm.

---

## Phụ lục: liên hệ với project Saella Platform

*(Phần này là nhận xét của Claude, không có trong video.)*

| Ý trong video | Saella hiện tại |
|---|---|
| Nền shadcn | Đã làm: 45 component shadcn ở `code/src/components/ui/`, 19 component ghép ở `components/saella/` |
| `design.md` | Đã có: `01 Docs/Design system/DESIGN.md`; giá trị token ở `code/src/styles/tokens.css` |
| `CLAUDE.md` bảo đọc design trước | Đã có |
| Package/nhánh riêng | Không cần: Saella Platform là project tách hẳn khỏi app thật (Next 14 + antd) |
| `meta.ts` cho từng component | **Chưa có.** Quy tắc đang gom chung trong DESIGN.md |
| Storybook | Không dùng: trang design system riêng đã bỏ ngày 2026-11-02, xem component trên màn sản phẩm |
| Git | **Chưa `git init`** |
| Thống nhất với team dev | Theo CLAUDE.md người dùng tự quyết; video khuyên bàn sớm để thiết kế dùng được khi chuyển vào app thật |
