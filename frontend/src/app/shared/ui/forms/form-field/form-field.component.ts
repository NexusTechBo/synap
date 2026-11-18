import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NgControl } from '@angular/forms';
import { map, of, startWith, switchMap } from 'rxjs';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { getValidationErrorMessage, translateValidationKey } from '../../../utils/validators.util';

function toggleAttribute(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  readonly label = input<string>();
  readonly hint = input<string>();
  readonly fieldId = input.required<string>();
  readonly errorMessages = input<Record<string, string>>({});
  readonly linkedErrorId = input<string | null>(null);

  private readonly i18n = inject(I18nService);
  private readonly ngControl = contentChild(NgControl);
  private readonly controlElement = contentChild(NgControl, { read: ElementRef });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly errorId = computed(() => `${this.fieldId()}-error`);
  protected readonly hintId = computed(() => `${this.fieldId()}-hint`);

  private readonly errors = toSignal(
    toObservable(this.ngControl).pipe(
      switchMap((ngControl) => {
        const control = ngControl?.control;
        if (!control) return of(null);
        return control.events.pipe(
          startWith(null),
          map(() => (control.touched && control.errors ? control.errors : null)),
        );
      }),
    ),
    { initialValue: null },
  );

  protected readonly error = computed(() => {
    this.i18n.currentLang();
    const errors = this.errors();
    if (!errors) return null;
    const override = this.errorMessages()[Object.keys(errors)[0]];
    if (override) return translateValidationKey(this.i18n, override);
    return getValidationErrorMessage(errors, this.i18n);
  });

  constructor() {
    afterRenderEffect(() => {
      const element =
        this.host.nativeElement.querySelector<HTMLElement>(`[id="${this.fieldId()}"]`) ??
        (this.controlElement()?.nativeElement as HTMLElement | undefined);
      if (!element) return;
      const linkedErrorId = this.linkedErrorId();
      const describedBy = this.error()
        ? this.errorId()
        : (linkedErrorId ?? (this.hint() ? this.hintId() : null));
      toggleAttribute(element, 'aria-invalid', this.error() || linkedErrorId ? 'true' : null);
      toggleAttribute(element, 'aria-describedby', describedBy);
    });
  }
}
