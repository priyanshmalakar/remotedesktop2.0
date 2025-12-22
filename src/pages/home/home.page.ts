import { Component, HostListener, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { UntilDestroy } from '@ngneat/until-destroy';
import { AddressBookService } from '../../app/core/services/address-book.service';
import { ScreenSelectComponent } from '../../app/shared/components/screen-select/screen-select.component';
import { ConnectService } from '../../app/core/services/connect.service';
import { ElectronService } from '../../app/core/services/electron.service';
import { AdsService } from '../../app/core/services/ads.service';

@UntilDestroy()
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  banner2: any = null;

  constructor(
    public electronService: ElectronService,
    public addressBookService: AddressBookService,
    public connectService: ConnectService,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController,
    private adsService: AdsService
  ) {}

  ngOnInit() {
    this.loadBanner2();
    this.resetRemoteIdInput();
  }

  resetRemoteIdInput() {
    this.connectService.remoteIdArray.forEach(item => {
      item.number = undefined;
    });
  }

  // ==============================
  // LOAD BANNER 2
  // ==============================
  loadBanner2() {
    this.adsService.getAds().subscribe({
      next: (ads: any[]) => {
        if (!Array.isArray(ads)) return;
        this.banner2 =
          ads.find(ad => ad.title === 'banner2' && ad.isActive) || null;
      },
      error: err => console.error('Banner2 API error:', err)
    });
  }

  // ==============================
  // OPEN AD LINK (FIXED)
  // ==============================
  openBannerLink(banner: any) {
    if (!banner?.redirectLink) return;

    // ✅ Electron → open in default browser
    if (this.electronService.isElectron && (window as any).require) {
      const { shell } = (window as any).require('electron');
      shell.openExternal(banner.redirectLink);
    } else {
      // ✅ Web
      window.open(banner.redirectLink, '_blank');
    }
  }

  // ==============================
  // COPY MY ID
  // ==============================
  async copyMyId() {
    const id = this.connectService.idArray.join('');
    await navigator.clipboard.writeText(id);

    const alert = await this.alertCtrl.create({
      header: 'Copied',
      message: 'ID copied to clipboard',
      buttons: ['OK']
    });

    await alert.present();
  }

  // ==============================
  // SCREEN SELECT
  // ==============================
  async screenSelect(autoSelect = true, replaceVideo?: boolean) {
    const modal = await this.modalCtrl.create({
      component: ScreenSelectComponent,
      backdropDismiss: false,
      componentProps: { autoSelect },
    });

    modal.onDidDismiss().then((data) => {
      if (data?.data) {
        replaceVideo
          ? this.connectService.replaceVideo(data.data.stream)
          : this.connectService.videoSource = data.data;
      }
    });

    await modal.present();
  }

  // ==============================
  // DIGIT INPUT HANDLING
  // ==============================
  onDigitInput(event: any, index: number) {
    const value = event.target.value;

    if (event.code === 'Backspace') {
      if (!value && index > 0) {
        const prevInput = document.querySelectorAll('.digit-input')[index - 1] as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          prevInput.value = '';
        }
      }
    } else if (value && index < 8) {
      const nextInput = document.querySelectorAll('.digit-input')[index + 1] as HTMLInputElement;
      if (nextInput) {
        setTimeout(() => nextInput.focus(), 10);
      }
    }
  }

  // ==============================
  // PASTE ID
  // ==============================
  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const id = (event.clipboardData?.getData('text') || '')
      .trim()
      .replace(/(\r\n|\n|\r)/gm, '');
    this.connectService.setId(id);
  }

  // ==============================
  // CONNECT
  // ==============================
  async connect() {
    if (this.connectService.connected) {
      const alert = await this.alertCtrl.create({
        header: 'Already Connected',
        message: 'Please disconnect first.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const id = this.connectService.remoteIdArray
      .map(i => i.number)
      .join('');

    if (id.length !== 9) {
      const alert = await this.alertCtrl.create({
        header: 'The ID is not complete',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    await this.addressBookService.add({ id });

    console.log('[HOME] Starting new connection to:', id);
    await new Promise(resolve => setTimeout(resolve, 300));

    this.connectService.connect(id);
  }

  // ==============================
  // DISCONNECT
  // ==============================
  async disconnect() {
    const alert = await this.alertCtrl.create({
      header: 'Disconnect',
      message: 'Are you sure you want to disconnect?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Disconnect',
          role: 'destructive',
          handler: () => this.connectService.reconnect()
        }
      ]
    });
    await alert.present();
  }
}
