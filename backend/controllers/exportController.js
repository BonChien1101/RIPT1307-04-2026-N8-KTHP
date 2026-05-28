const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');

const monthFilter = (column, year, month, dialect) => {
  if (dialect === 'mysql') {
    return {
      sql: `YEAR(${column}) = ? AND MONTH(${column}) = ?`,
      params: [String(year), String(month)],
    };
  }
  return {
    sql: `strftime('%Y', ${column}) = ? AND strftime('%m', ${column}) = ?`,
    params: [String(year), String(month).padStart(2, '0')],
  };
};

const exportBorrowPDF = async (req, res) => {
  try {
    const requestId = Number(req.params.requestId);
    if (!requestId) return fail(res, 'ID không hợp lệ', 'VALIDATION_ERROR', 400);

    const [reqRows] = await sequelize.query(
      `SELECT br.id, br.borrow_date, br.expected_return_date, br.actual_return_date,
              br.status, br.note,
              u.full_name as user_name, u.email, u.student_code
       FROM borrow_requests br
       JOIN users u ON u.id = br.user_id
       WHERE br.id = ? LIMIT 1`,
      { replacements: [requestId] }
    );
    if (!reqRows.length) return fail(res, 'Không tìm thấy yêu cầu mượn', 'NOT_FOUND', 404);

    const request = reqRows[0];
    const [items] = await sequelize.query(
      `SELECT bi.quantity, e.name as equipment_name, e.category
       FROM borrow_items bi
       JOIN equipments e ON e.id = bi.equipment_id
       WHERE bi.request_id = ?`,
      { replacements: [requestId] }
    );

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="phieu-muon-${requestId}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('PHIEU MUON THIET BI', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('BorrowX Smart Campus', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Request info
    doc.fontSize(12).font('Helvetica-Bold').text('Thong tin phieu muon:');
    doc.font('Helvetica')
      .text(`Ma phieu: #${request.id}`)
      .text(`Trang thai: ${request.status}`)
      .text(`Ngay muon: ${request.borrow_date}`)
      .text(`Ngay tra du kien: ${request.expected_return_date}`)
      .text(`Ngay tra thuc te: ${request.actual_return_date || 'Chua tra'}`)
      .text(`Ghi chu: ${request.note || 'Khong co'}`);

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Thong tin nguoi muon:');
    doc.font('Helvetica')
      .text(`Ho ten: ${request.user_name}`)
      .text(`Email: ${request.email}`)
      .text(`Ma sinh vien: ${request.student_code || 'N/A'}`);

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Danh sach thiet bi:');
    doc.moveDown(0.5);

    items.forEach((item, idx) => {
      doc.font('Helvetica').text(`${idx + 1}. ${item.equipment_name} (${item.category || 'N/A'}) - So luong: ${item.quantity}`);
    });

    doc.moveDown(2);
    doc.font('Helvetica').text('Chu ky nguoi muon: ________________________', { align: 'left' });
    doc.moveDown();
    doc.text('Chu ky quan ly: ________________________', { align: 'left' });

    doc.end();
  } catch (e) {
    return fail(res, 'Lỗi server khi tạo PDF', 'INTERNAL_ERROR', 500);
  }
};

const exportStatisticsExcel = async (req, res) => {
  try {
    const { month, year } = req.query || {};
    const nam = Number(year) || new Date().getFullYear();
    const thang = Number(month) || new Date().getMonth() + 1;

    const dialect = sequelize.getDialect();
    const filter = monthFilter('br.borrow_date', nam, thang, dialect);

    const [topEquipment] = await sequelize.query(
      `SELECT e.id, e.name, e.category, SUM(bi.quantity) as tong_muon
       FROM borrow_items bi
       JOIN borrow_requests br ON br.id = bi.request_id
       JOIN equipments e ON e.id = bi.equipment_id
       WHERE ${filter.sql}
       GROUP BY e.id, e.name, e.category
       ORDER BY tong_muon DESC
       LIMIT 20`,
      { replacements: filter.params }
    );

    const [monthlyCount] = await sequelize.query(
      `SELECT DATE(borrow_date) as ngay, COUNT(*) as tong, status
       FROM borrow_requests
       WHERE ${monthFilter('borrow_date', nam, thang, dialect).sql}
       GROUP BY DATE(borrow_date), status
       ORDER BY ngay ASC`,
      { replacements: monthFilter('borrow_date', nam, thang, dialect).params }
    );

    const [penalties] = await sequelize.query(
      `SELECT p.id, u.full_name, u.student_code, p.amount, p.reason, p.paid, p.created_at
       FROM penalties p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 100`
    );

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BorrowX';
    workbook.created = new Date();

    // Sheet 1: Top Equipment
    const ws1 = workbook.addWorksheet('Top Thiet Bi');
    ws1.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Ten Thiet Bi', key: 'name', width: 30 },
      { header: 'Danh Muc', key: 'category', width: 20 },
      { header: 'Tong So Luong Muon', key: 'tong_muon', width: 25 },
    ];
    ws1.getRow(1).font = { bold: true };
    topEquipment.forEach((row, i) => {
      ws1.addRow({ stt: i + 1, name: row.name, category: row.category || 'N/A', tong_muon: row.tong_muon });
    });

    // Sheet 2: Monthly borrow count
    const ws2 = workbook.addWorksheet('Thong Ke Ngay');
    ws2.columns = [
      { header: 'Ngay', key: 'ngay', width: 15 },
      { header: 'Trang Thai', key: 'status', width: 15 },
      { header: 'So Luong', key: 'tong', width: 12 },
    ];
    ws2.getRow(1).font = { bold: true };
    monthlyCount.forEach((row) => {
      ws2.addRow({ ngay: row.ngay, status: row.status, tong: row.tong });
    });

    // Sheet 3: Penalties
    const ws3 = workbook.addWorksheet('Phat');
    ws3.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Ho Ten', key: 'full_name', width: 25 },
      { header: 'MSSV', key: 'student_code', width: 15 },
      { header: 'So Tien (VND)', key: 'amount', width: 18 },
      { header: 'Ly Do', key: 'reason', width: 30 },
      { header: 'Da Thanh Toan', key: 'paid', width: 18 },
      { header: 'Ngay Tao', key: 'created_at', width: 20 },
    ];
    ws3.getRow(1).font = { bold: true };
    penalties.forEach((row, i) => {
      ws3.addRow({
        stt: i + 1,
        full_name: row.full_name,
        student_code: row.student_code || 'N/A',
        amount: row.amount,
        reason: row.reason,
        paid: row.paid ? 'Co' : 'Chua',
        created_at: row.created_at,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="statistics-${nam}-${thang}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    return fail(res, 'Lỗi server khi xuất Excel thống kê', 'INTERNAL_ERROR', 500);
  }
};

const exportBorrowsExcel = async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const where = [];
    const params = [];

    if (from) { where.push('br.borrow_date >= ?'); params.push(from); }
    if (to) { where.push('br.borrow_date <= ?'); params.push(to); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await sequelize.query(
      `SELECT br.id, br.borrow_date, br.expected_return_date, br.actual_return_date,
              br.status, br.note,
              u.full_name as user_name, u.email, u.student_code,
              GROUP_CONCAT(e.name) as equipment_names
       FROM borrow_requests br
       JOIN users u ON u.id = br.user_id
       LEFT JOIN borrow_items bi ON bi.request_id = br.id
       LEFT JOIN equipments e ON e.id = bi.equipment_id
       ${whereSql}
       GROUP BY br.id, br.borrow_date, br.expected_return_date, br.actual_return_date,
                br.status, br.note, u.full_name, u.email, u.student_code
       ORDER BY br.id DESC`,
      { replacements: params }
    );

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BorrowX';
    const ws = workbook.addWorksheet('Danh Sach Muon');
    ws.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Ho Ten', key: 'user_name', width: 25 },
      { header: 'MSSV', key: 'student_code', width: 15 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Ngay Muon', key: 'borrow_date', width: 15 },
      { header: 'Ngay Tra DK', key: 'expected_return_date', width: 18 },
      { header: 'Ngay Tra TT', key: 'actual_return_date', width: 18 },
      { header: 'Trang Thai', key: 'status', width: 15 },
      { header: 'Thiet Bi', key: 'equipment_names', width: 40 },
      { header: 'Ghi Chu', key: 'note', width: 30 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach((row) => {
      ws.addRow({
        id: row.id,
        user_name: row.user_name,
        student_code: row.student_code || 'N/A',
        email: row.email,
        borrow_date: row.borrow_date,
        expected_return_date: row.expected_return_date,
        actual_return_date: row.actual_return_date || '',
        status: row.status,
        equipment_names: row.equipment_names || '',
        note: row.note || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="borrows-export.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    return fail(res, 'Lỗi server khi xuất Excel mượn', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { exportBorrowPDF, exportStatisticsExcel, exportBorrowsExcel };
