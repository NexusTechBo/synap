import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  imports: [TranslatePipe],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  private readonly _notificationService = inject(NotificationService);
  protected notifications = this._notificationService.notifications;
  protected readonly latestSuccess = computed(() => this.latestMessage('success'));
  protected readonly latestError = computed(() => this.latestMessage('error'));
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  private shownId: number | null = null;

  constructor() {
    afterRenderEffect(() => {
      const element = this.container().nativeElement;
      const latestId = this.notifications().at(-1)?.id ?? null;
      if (latestId === null) {
        if (this.shownId !== null) element.hidePopover?.();
        this.shownId = null;
        return;
      }
      if (this.shownId !== null && latestId <= this.shownId) return;
      if (this.shownId !== null) element.hidePopover?.();
      element.showPopover?.();
      this.shownId = latestId;
    });
  }

  private latestMessage(type: 'success' | 'error'): string {
    return (
      this.notifications()
        .filter((n) => n.type === type)
        .at(-1)?.message ?? ''
    );
  }

  dismiss(id: number): void {
    this._notificationService.dismiss(id);
  }
}
