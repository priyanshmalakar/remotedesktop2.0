import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { AddressBookService } from '../../app/core/services/address-book.service';
import { ScreenSelectComponent } from '../../app/shared/components/screen-select/screen-select.component';
import { ConnectService } from '../../app/core/services/connect.service';
import { ElectronService } from '../../app/core/services/electron.service';
import { AdsService } from '../../app/core/services/ads.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {

  banner2: any = null;

  private adsSub?: Subscription;
  private screenModalOpen = false;

  constructor(
    public electronService: ElectronService,
    public addressBookService: AddressBookService,
    public connectService: ConnectService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private adsService: AdsService
  ) {}

  // ==============================
  // INIT
  // ==============================
  ngOnInit(): void {
    this.resetRemoteIdInput();
    this.loadBanner2();
  }

  ngOnDestroy(): void {
    this.adsSub?.unsubscribe();
  }

  // ==============================
  // RESET INPUT
  // ==============================
  private resetRemoteIdInput(): void {
    this.connectService.remoteIdArray.forEach(i => (i.number = ''));
  }

  // ==============================
  // LOAD BANNER (SINGLE CALL)
  // ==============================
  private loadBanner2(): void {
    this.adsSub = this.adsService.getAds().subscribe({
      next: (ads: any[]) => {
        if (!Array.isArray(ads)) return;
        this.banner2 =
          ads.find(ad => ad.title === 'banner2' && ad.isActive) || null;
      },
      error: err => console.error('[ADS]', err),
    });
  }

  // ==============================
  // OPEN AD LINK (ELECTRON SAFE)
  // ==============================
  openBannerLink(banner: any): void {
    if (!banner?.redirectLink) return;

    if (this.electronService.isElectron && (window as any).require) {
      const { shell } = (window as any).require('electron');
      shell.openExternal(banner.redirectLink);
    } else {
      window.open(banner.redirectLink, '_blank', 'noopener,noreferrer');
    }
  }

  // ==============================
  // COPY MY ID
  // ==============================
  async copyMyId(): Promise<void> {
    const id = this.connectService.idArray.join('');
    await navigator.clipboard.writeText(id);

    const alert = await this.alertCtrl.create({
      header: 'Copied',
      message: 'ID copied to clipboard',
      buttons: ['OK'],
    });

    await alert.present();
  }

  // ==============================
  // SCREEN SELECT (ANTI DOUBLE OPEN)
  // ==============================
  async screenSelect(autoSelect = true, replaceVideo?: boolean): Promise<void> {
    if (this.screenModalOpen) return;
    this.screenModalOpen = true;

    const modal = await this.modalCtrl.create({
      component: ScreenSelectComponent,
      backdropDismiss: false,
      componentProps: { autoSelect },
    });

    modal.onDidDismiss().then(result => {
      this.screenModalOpen = false;
      if (!result?.data) return;

      replaceVideo
        ? this.connectService.replaceVideo(result.data.stream)
        : (this.connectService.videoSource = result.data);
    });

    await modal.present();
  }

  // ==============================
  // DIGIT INPUT HANDLING
  // ==============================
  onDigitInput(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    const inputs = document.querySelectorAll<HTMLInputElement>('.digit-input');

    if (event.key === 'Backspace' && !input.value && index > 0) {
      inputs[index - 1]?.focus();
      return;
    }

    if (input.value && index < inputs.length - 1) {
      setTimeout(() => inputs[index + 1]?.focus(), 10);
    }
  }

  // ==============================
  // PASTE ID (SAFE)
  // ==============================
  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    if (this.connectService.connected) return;

    const pasted = event.clipboardData?.getData('text') || '';
    const id = pasted.replace(/\D/g, '');

    if (id.length === 9) {
      this.connectService.setId(id);
    }
  }

  // ==============================
  // CONNECT
  // ==============================
  async connect(): Promise<void> {
    if (this.connectService.connected) {
      const alert = await this.alertCtrl.create({
        header: 'Already Connected',
        message: 'Please disconnect first.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const id = this.connectService.remoteIdArray
      .map(i => i.number)
      .join('');

    if (id.length !== 9) {
      const alert = await this.alertCtrl.create({
        header: 'Invalid ID',
        message: 'Please enter complete ID',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    await this.addressBookService.add({ id });
    this.connectService.connect(id);
  }

  // ==============================
  // DISCONNECT
  // ==============================
  async disconnect(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Disconnect',
      message: 'Are you sure you want to disconnect?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Disconnect',
          role: 'destructive',
          handler: () => this.connectService.reconnect(),
        },
      ],
    });

    await alert.present();
  }
}
