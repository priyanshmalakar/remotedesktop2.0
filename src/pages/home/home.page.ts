// new add banner related to new version update
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

  loadBanner2() {
    this.adsService.getAds().subscribe({
      next: (ads: any[]) => {
        if (!Array.isArray(ads)) return;
        this.banner2 =
          ads.find(ad => ad.title === 'banner2' && ad.isActive) || null;
      }
    });
  }

  openBannerLink(banner: any) {
    if (banner?.redirectLink) {
      window.open(banner.redirectLink, '_blank');
    }
  }

  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const id = (event.clipboardData?.getData('text') || '')
      .trim()
      .replace(/(\r\n|\n|\r)/gm, '');
    this.connectService.setId(id);
  }

  // id copy function
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

  onDigitInput(event: any) {
    let element;
    if (event.code !== 'Backspace') {
      element = event.srcElement.nextElementSibling;
    } else {
      element = event.srcElement.previousElementSibling;
      if (element) element.value = '';
    }
    if (element) setTimeout(() => element.focus(), 10);
  }

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
    
    // ⭐ Add delay to ensure cleanup
    console.log('[HOME] Starting new connection to:', id);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    this.connectService.connect(id);
  }
}
