import { Component, HostListener, OnInit } from '@angular/core';
import { ConfirmDialogService } from '@core/services/ui/confirm-dialog.service';
import { ConfirmDialogConfig } from '@core/models/confirm-dialog.model';

@Component({
  selector: 'app-dialog-confirm',
  templateUrl: './dialog-confirm.component.html',
  styleUrl: './dialog-confirm.component.scss',
})
export class DialogConfirmComponent implements OnInit {
  config: ConfirmDialogConfig | null = null;
  closing = false;

  constructor(private confirmDialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    this.confirmDialogService.config$.subscribe((config) => {
      if (config) {
        this.closing = false;
      }
      this.config = config;
    });
  }

  confirm(): void {
    this.closing = true;
    setTimeout(() => this.confirmDialogService.resolve(true), 200);
  }

  cancel(): void {
    this.closing = true;
    setTimeout(() => this.confirmDialogService.resolve(false), 200);
  }

  onOverlayClick(): void {
    this.cancel();
  }

  // Dismissing has to be reachable from the keyboard, not only by clicking the backdrop
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.config && !this.closing) this.cancel();
  }
}
