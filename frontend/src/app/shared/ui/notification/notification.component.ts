import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  dismiss(id: number): void {
    this._notificationService.dismiss(id);
  }
}
