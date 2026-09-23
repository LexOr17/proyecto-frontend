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

  protected readonly pageSizeOptions = [5, 10, 15, 20, 50];

  protected pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i) as (number | '...')[];
    }

    if (current <= 3) {
      return [0, 1, 2, 3, 4, '...', total - 1] as (number | '...')[];
    }

    if (current >= total - 4) {
      return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1] as (number | '...')[];
    }

    return [0, '...', current - 1, current, current + 1, '...', total - 1] as (number | '...')[];
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
