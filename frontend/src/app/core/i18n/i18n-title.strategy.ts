import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from './i18n.service';

@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18nService);
  private lastSnapshot: RouterStateSnapshot | null = null;

  constructor() {
    super();
    effect(() => {
      this.i18n.currentLang();
      if (this.lastSnapshot) {
        this.applyTitle(this.lastSnapshot);
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.lastSnapshot = snapshot;
    this.applyTitle(snapshot);
  }

  private applyTitle(snapshot: RouterStateSnapshot): void {
    const titleKey = this.buildTitle(snapshot);
    if (!titleKey) return;
    const translated = this.i18n.translate(titleKey);
    this.title.setTitle(translated);
  }
}
