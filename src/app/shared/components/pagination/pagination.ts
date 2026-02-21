import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PageEvent } from '../../interfaces/page.interface';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {

  currentPage = input.required<number>();
  totalPages = input.required<number>();
  totalElements = input.required<number>();
  pageSize = input.required<number>();

  pageChange = output<PageEvent>();

  protected readonly pageSizeOptions = [5, 10, 15, 20];

  protected pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 0; i < total; i++) pages.push(i);
      return pages;
    }

    // Siempre mostrar primera página
    pages.push(0);

    if (current > 2) {
      pages.push('...');
    }

    // Páginas alrededor de la actual
    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 3) {
      pages.push('...');
    }

    // Siempre mostrar última página
    pages.push(total - 1);

    return pages;
  });

  protected readonly showingFrom = computed(() => {
    if (this.totalElements() === 0) return 0;
    return this.currentPage() * this.pageSize() + 1;
  });

  protected readonly showingTo = computed(() =>
    Math.min((this.currentPage() + 1) * this.pageSize(), this.totalElements())
  );

  protected goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages() || page === this.currentPage()) return;
    this.pageChange.emit({ page, size: this.pageSize() });
  }

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const size = Number(select.value);
    this.pageChange.emit({ page: 0, size });
  }
}
