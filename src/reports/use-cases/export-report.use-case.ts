import { BadRequestException, Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ExportReportQueryInput,
  PreviewReportQueryInput,
  ReportFeature,
  ReportFormat,
} from 'src/schemas/reports.schema';
import PDFDocument = require('pdfkit');

type ReportFilters = Omit<PreviewReportQueryInput, 'limit'> & {
  limit?: number;
};

interface ExportReportResult {
  content: string | Buffer;
  contentType: string;
  fileName: string;
}

interface ReportTableData {
  headers: string[];
  rows: Array<Array<string | number | null>>;
}

@Injectable()
export class ExportReportUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    feature: ReportFeature,
    format: ReportFormat,
    filters: ExportReportQueryInput,
  ): Promise<ExportReportResult> {
    if (format === 'pdf') {
      const tableData = await this.buildTableData(
        userId,
        feature,
        filters,
        5000,
      );

      const pdf = await this.toPdf(tableData.headers, tableData.rows, {
        feature,
        filters,
      });

      return {
        content: pdf,
        contentType: 'application/pdf',
        fileName: `${feature}-report-${Date.now()}.pdf`,
      };
    }

    if (format !== 'csv') {
      throw new BadRequestException('Formato de exportação inválido.');
    }

    const tableData = await this.buildTableData(userId, feature, filters, 5000);
    const csv = this.toCsv(tableData.headers, tableData.rows);

    return {
      content: csv,
      contentType: 'text/csv; charset=utf-8',
      fileName: `${feature}-report-${Date.now()}.csv`,
    };
  }

  async preview(
    userId: string,
    feature: ReportFeature,
    filters: PreviewReportQueryInput,
  ): Promise<ReportTableData> {
    return this.buildTableData(userId, feature, filters, filters.limit);
  }

  private async buildTableData(
    userId: string,
    feature: ReportFeature,
    filters: ReportFilters,
    limit: number,
  ): Promise<ReportTableData> {
    switch (feature) {
      case 'transacoes':
        return this.buildTransactionsTable(userId, filters, limit);
      case 'contas':
        return this.buildBillsTable(userId, filters, limit);
      case 'cartoes':
        return this.buildCardsTable(userId, filters, limit);
      case 'assinaturas':
        return this.buildSubscriptionsTable(userId, filters, limit);
      case 'orcamentos':
        return this.buildBudgetsTable(userId, filters, limit);
      case 'cofrinhos':
        return this.buildVaultsTable(userId, filters, limit);
      default:
        throw new BadRequestException('Relatório não suportado.');
    }
  }

  private toCsv(headers: string[], rows: Array<Array<string | number | null>>) {
    const headerLine = headers.map((h) => this.escapeCsv(h)).join(',');
    const lines = rows.map((row) =>
      row.map((cell) => this.escapeCsv(cell)).join(','),
    );

    return [headerLine, ...lines].join('\n');
  }

  private async toPdf(
    headers: string[],
    rows: Array<Array<string | number | null>>,
    context: {
      feature: ReportFeature;
      filters: ExportReportQueryInput;
    },
  ): Promise<Buffer> {
    const logo = await this.loadLogoBuffer();

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 36,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const pageBottom = doc.page.height - doc.page.margins.bottom;
      const firstPageTableTop = 132;
      const repeatedPageTableTop = doc.page.margins.top;
      let currentTableTop = firstPageTableTop;
      const tableLeft = doc.page.margins.left;
      const headerHeight = 28;
      const rowHeight = 26;
      const cellPadding = 6;
      const rowFontSize = 8.5;
      const headerFontSize = 8.25;

      // Ajustes de Posicionamento da Logo e Texto (Lado a Lado)
      const logoSize = 28;
      const brandTextWidth = 80;
      const logoSpacing = 8;
      const totalBrandWidth = logoSize + logoSpacing + brandTextWidth;

      const logoX = doc.page.width - doc.page.margins.right - totalBrandWidth;
      const logoTop = 36;

      const brandTextX = logoX + logoSize + logoSpacing;
      const brandTextY = logoTop + 8;

      const availableWidth = pageWidth;
      const columnWidth = Math.max(
        72,
        availableWidth / Math.max(headers.length, 1),
      );
      const columnWidths = headers.map(() => columnWidth);
      const maxColumnsWidth = columnWidths.reduce(
        (sum, width) => sum + width,
        0,
      );

      const renderTitleBlock = () => {
        if (logo) {
          doc.image(logo, logoX, logoTop, {
            fit: [logoSize, logoSize],
            align: 'left',
            valign: 'top',
          });
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#111827')
          .text('Salva Contas', brandTextX, brandTextY, {
            width: brandTextWidth,
            align: 'left',
            lineBreak: false,
          });

        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor('#111827')
          .text('Relatório de exportação', tableLeft, 36, {
            width: pageWidth - totalBrandWidth - 20,
          });
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#4B5563')
          .text(`Funcionalidade: ${context.feature}`, tableLeft, 60);
        doc.text(
          `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
          tableLeft,
          76,
        );

        const filterSummary = this.describeFilters(context.filters);
        if (filterSummary.length > 0) {
          doc
            .font('Helvetica-Bold')
            .fillColor('#111827')
            .text('Filtros aplicados', tableLeft, 94);
          doc.font('Helvetica').fillColor('#4B5563');
          filterSummary.forEach((line, index) => {
            doc.text(line, tableLeft, 110 + index * 12, {
              width: pageWidth,
            });
          });
        }
      };

      const renderTableHeader = (y: number) => {
        let x = tableLeft;
        doc.save();
        doc
          .fillColor('#F3F4F6')
          .rect(tableLeft, y, maxColumnsWidth, headerHeight)
          .fill();
        doc.restore();

        headers.forEach((header, index) => {
          const width = columnWidths[index];
          doc
            .font('Helvetica-Bold')
            .fontSize(headerFontSize)
            .fillColor('#111827')
            .text(header, x + cellPadding, y + 5, {
              width: width - cellPadding * 2,
              height: headerHeight - 10,
              ellipsis: true,
              lineBreak: false,
              align: 'left',
            });

          doc
            .strokeColor('#E5E7EB')
            .lineWidth(1)
            .rect(x, y, width, headerHeight)
            .stroke();
          x += width;
        });
      };

      const renderRow = (
        row: Array<string | number | null>,
        y: number,
        rowIndex: number,
      ) => {
        let x = tableLeft;
        const backgroundColor = rowIndex % 2 === 0 ? '#FFFFFF' : '#FAFAFA';

        doc.save();
        doc
          .fillColor(backgroundColor)
          .rect(tableLeft, y, maxColumnsWidth, rowHeight)
          .fill();
        doc.restore();

        row.forEach((cell, index) => {
          const width = columnWidths[index];
          const text = this.escapePdfCell(cell);

          doc
            .font('Helvetica')
            .fontSize(rowFontSize)
            .fillColor('#111827')
            .text(text, x + cellPadding, y + 5, {
              width: width - cellPadding * 2,
              height: rowHeight - 10,
              ellipsis: true,
              lineBreak: false,
              align: 'left',
            });

          doc
            .strokeColor('#E5E7EB')
            .lineWidth(1)
            .rect(x, y, width, rowHeight)
            .stroke();
          x += width;
        });
      };

      const ensurePageSpace = (requiredHeight: number, currentY: number) => {
        if (currentY + requiredHeight <= pageBottom) {
          return currentY;
        }

        doc.addPage();
        currentTableTop = repeatedPageTableTop;
        renderTableHeader(currentTableTop);
        return currentTableTop + headerHeight;
      };

      renderTitleBlock();
      renderTableHeader(currentTableTop);

      let y = currentTableTop + headerHeight;

      rows.forEach((row, rowIndex) => {
        y = ensurePageSpace(rowHeight, y);
        renderRow(row, y, rowIndex);
        y += rowHeight;
      });

      doc.end();
    });
  }

  private async loadLogoBuffer(): Promise<Buffer | null> {
    const cwd = process.cwd();

    const pngCandidates = [
      join(cwd, 'public', 'icon.png'),
      join(cwd, 'salva-contas-server', 'public', 'icon.png'),
    ];

    for (const pngPath of pngCandidates) {
      try {
        return await readFile(pngPath);
      } catch {}
    }

    return null;
  }

  private escapeCsv(value: string | number | null): string {
    if (value === null || value === undefined) return '';

    const strValue = String(value);
    const escaped = strValue.replace(/"/g, '""');
    const needsQuotes = /[",\n\r]/.test(escaped);

    return needsQuotes ? `"${escaped}"` : escaped;
  }

  private escapePdfCell(value: string | number | null): string {
    if (value === null || value === undefined) return '-';
    return String(value);
  }

  private describeFilters(filters: ExportReportQueryInput): string[] {
    const lines: string[] = [];

    if (filters.query) lines.push(`Busca: ${filters.query}`);
    if (filters.categoryId) lines.push(`Categoria: ${filters.categoryId}`);
    if (filters.type) lines.push(`Tipo: ${this.formatType(filters.type)}`);
    if (filters.status)
      lines.push(`Status: ${this.formatStatus(filters.status)}`);
    if (filters.month && filters.year)
      lines.push(`Período: ${filters.month}/${filters.year}`);
    if (filters.startDate || filters.endDate) {
      const start = filters.startDate
        ? this.formatDate(filters.startDate)
        : 'início';
      const end = filters.endDate ? this.formatDate(filters.endDate) : 'hoje';
      lines.push(`Período selecionado: ${start} - ${end}`);
    }

    return lines;
  }

  private formatDate(value?: Date | null): string {
    if (!value) return '';
    return value.toLocaleDateString('pt-BR');
  }

  private formatDateTime(value?: Date | null): string {
    if (!value) return '';
    return value.toLocaleString('pt-BR');
  }

  private formatCurrency(value: { toString(): string }): string {
    const numeric = Number(value.toString());
    if (Number.isNaN(numeric)) return value.toString();
    return numeric.toFixed(2);
  }

  private formatType(value: string): string {
    const map: Record<string, string> = {
      expense: 'Despesa',
      income: 'Receita',
      weekly: 'Semanal',
      monthly: 'Mensal',
      yearly: 'Anual',
    };
    return map[value] ?? value;
  }

  private formatStatus(value: string): string {
    const map: Record<string, string> = {
      paid: 'Pago',
      pending: 'Pendente',
      active: 'Ativo',
      inactive: 'Inativo',
      blocked: 'Bloqueado',
      expired: 'Expirado',
      cancelled: 'Cancelado',
    };
    return map[value] ?? value;
  }

  private formatFlag(value: string): string {
    const map: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      american_express: 'American Express',
      elo: 'Elo',
      hipercard: 'Hipercard',
      other: 'Outros',
    };
    return map[value] ?? value;
  }

  private applyDateFilters(createdAtField = 'createdAt') {
    return (filters: ReportFilters) => {
      const where: Record<string, unknown> = {};

      if (filters.month && filters.year) {
        const start = new Date(filters.year, filters.month - 1, 1);
        const end = new Date(filters.year, filters.month, 1);
        where[createdAtField] = { gte: start, lt: end };
      }

      if (filters.startDate || filters.endDate) {
        where[createdAtField] = {
          ...(filters.startDate ? { gte: filters.startDate } : {}),
          ...(filters.endDate ? { lte: filters.endDate } : {}),
        };
      }

      return where;
    };
  }

  private async buildTransactionsTable(
    userId: string,
    filters: ReportFilters,
    limit: number,
  ): Promise<ReportTableData> {
    const dateWhere = this.applyDateFilters('createdAt')(filters);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        ...(filters.query
          ? {
              OR: [
                {
                  description: { contains: filters.query, mode: 'insensitive' },
                },
                {
                  categoryName: {
                    contains: filters.query,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...dateWhere,
      },
      orderBy: [
        { paymentDate: 'desc' },
        { dueDate: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    const rows = transactions.map((tx) => [
      tx.description,
      tx.categoryName,
      this.formatType(tx.type),
      this.formatStatus(tx.status),
      this.formatCurrency(tx.amount),
      this.formatDate(tx.paymentDate),
      this.formatDate(tx.dueDate),
      this.formatDateTime(tx.createdAt),
    ]);

    return {
      headers: [
        'Descrição',
        'Categoria',
        'Tipo',
        'Status',
        'Valor',
        'Data de pagamento',
        'Data de vencimento',
        'Criado em',
      ],
      rows,
    };
  }

  private async buildBillsTable(
    userId: string,
    filters: ReportFilters,
    limit: number,
  ): Promise<ReportTableData> {
    const dateWhere = this.applyDateFilters('dueDate')(filters);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        ...dateWhere,
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    });

    const rows = transactions.map((tx) => [
      tx.description,
      tx.categoryName,
      this.formatStatus(tx.status),
      this.formatCurrency(tx.amount),
      this.formatDate(tx.dueDate),
      this.formatDate(tx.paymentDate),
    ]);

    return {
      headers: [
        'Descrição',
        'Categoria',
        'Status',
        'Valor',
        'Vencimento',
        'Pagamento',
      ],
      rows,
    };
  }

  private async buildCardsTable(
    userId: string,
    filters: ReportFilters,
    limit: number,
  ): Promise<ReportTableData> {
    const dateWhere = this.applyDateFilters('createdAt')(filters);

    const cards = await this.prisma.creditCard.findMany({
      where: {
        userId,
        ...dateWhere,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const rows = cards.map((card) => [
      card.name,
      this.formatFlag(card.flag),
      card.lastFourDigits,
      this.formatCurrency(card.limit),
      this.formatCurrency(card.availableLimit),
      card.closingDay,
      card.dueDay,
      this.formatStatus(card.status),
      this.formatDateTime(card.createdAt),
    ]);

    return {
      headers: [
        'Nome',
        'Bandeira',
        'Últimos 4 dígitos',
        'Limite total',
        'Limite disponível',
        'Dia de fechamento',
        'Dia de vencimento',
        'Status',
        'Criado em',
      ],
      rows,
    };
  }

  private async buildSubscriptionsTable(
    userId: string,
    filters: ReportFilters,
    limit: number,
  ): Promise<ReportTableData> {
    const dateWhere = this.applyDateFilters('createdAt')(filters);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        ...dateWhere,
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const rows = subscriptions.map((sub) => [
      sub.description,
      sub.category?.name ?? '',
      this.formatType(sub.frequency),
      this.formatCurrency(sub.amount),
      this.formatStatus(sub.isActive ? 'active' : 'inactive'),
      this.formatDateTime(sub.createdAt),
    ]);

    return {
      headers: [
        'Descrição',
        'Categoria',
        'Frequência',
        'Valor',
        'Status',
        'Criado em',
      ],
      rows,
    };
  }

  private async buildBudgetsTable(
    userId: string,
    filters: ReportFilters,
    limit: number,
  ): Promise<ReportTableData> {
    const dateWhere = this.applyDateFilters('createdAt')(filters);

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        ...(filters.month ? { month: filters.month } : {}),
        ...(filters.year ? { year: filters.year } : {}),
        ...dateWhere,
      },
      include: { category: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    const rows = budgets.map((budget) => [
      budget.category?.name ?? '',
      this.formatCurrency(budget.amount),
      budget.month,
      budget.year,
      this.formatDateTime(budget.createdAt),
    ]);

    return {
      headers: ['Categoria', 'Valor orçado', 'Mês', 'Ano', 'Criado em'],
      rows,
    };
  }

  private async buildVaultsTable(
    userId: string,
    filters: ReportFilters,
    limit: number,
  ): Promise<ReportTableData> {
    const dateWhere = this.applyDateFilters('createdAt')(filters);

    const vaults = await this.prisma.vault.findMany({
      where: {
        userId,
        ...dateWhere,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const rows = vaults.map((vault) => [
      vault.name,
      this.formatCurrency(vault.currentAmount),
      vault.targetAmount ? this.formatCurrency(vault.targetAmount) : '',
      this.formatDateTime(vault.createdAt),
    ]);

    return {
      headers: ['Nome', 'Valor atual', 'Meta', 'Criado em'],
      rows,
    };
  }
}
