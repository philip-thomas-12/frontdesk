import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  public show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, title, message };
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, newToast]);

    setTimeout(() => {
      this.remove(id);
    }, 4500);
  }

  public success(message: string, title: string = 'Success') {
    this.show(message, 'success', title);
  }

  public error(message: string, title: string = 'Error') {
    this.show(message, 'error', title);
  }

  public warning(message: string, title: string = 'Warning') {
    this.show(message, 'warning', title);
  }

  public info(message: string, title: string = 'Info') {
    this.show(message, 'info', title);
  }

  public remove(id: string) {
    const current = this.toastsSubject.value;
    this.toastsSubject.next(current.filter((t) => t.id !== id));
  }
}
