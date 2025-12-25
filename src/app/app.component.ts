import { AfterViewInit, Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AppConfig } from '../environments/environment';
import { ElectronService } from './core/services/electron.service';
import { AppService } from './core/services/app.service';
import { ConnectService } from './core/services/connect.service';
import { SettingsService } from './core/services/settings.service';
import { ScreenSelectComponent } from './shared/components/screen-select/screen-select.component';
import { TranslateService } from '@ngx-translate/core';
import { AdsService } from './core/services/ads.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {

  // ==============================
  // ELECTRON SAFE ACCESS
  // ==============================
  platform = (window as any)?.process ?? null;
  process = (window as any)?.process ?? null;
  version = '##version##';

  // ==============================
  // SIDE MENU PAGES
  // ==============================
  appPages = [
    { title: 'Home', url: '/home', icon: 'code-working-outline' },
    { title: 'Address book', url: '/address-book', icon: 'book-outline' },
  ];

  initDone = false;
  isRemote = false;
  isInfoWindow = false;

  // ==============================
  // BANNERS
  // ==============================

  banner1: any = null;
banner2: any = null;

  constructor(
    public electronService: ElectronService,
    public appService: AppService,
    private modalCtrl: ModalController,
    private connectService: ConnectService,
    private settingsService: SettingsService,
    private translateService: TranslateService,
 private adsService: AdsService
  ) {
    console.log('AppConfig', AppConfig);
  }

  // ==============================
  // AFTER VIEW INIT
  // ==============================
  async ngAfterViewInit() {
    this.loadBanners();  


    // LOAD BANNERS
    this.loadBanners();

    if (this.electronService.isElectron) {

      this.appPages.push({
        title: this.translateService.instant('Settings'),
        url: '/settings',
        icon: 'cog-outline',
      });

      await this.settingsService.load();

      if (window.location.href.includes('id=')) {
        this.isRemote = true;
      } else if (window.location.href.includes('info-window')) {
        this.isRemote = true;
        this.isInfoWindow = true;
      } else {
        this.screenSelect();
      }
    }
  }


  
  // ==============================
  // FETCH ADS FROM BACKEND
  // ==============================
  loadBanners() {
    this.adsService.getAds().subscribe({
      next: (ads: any[]) => {
        if (!Array.isArray(ads)) return;

        const activeAds = ads.filter(ad => ad.isActive);

        this.banner1 = activeAds.find(ad => ad.title === 'banner1') || null;
        this.banner2 = activeAds.find(ad => ad.title === 'banner2') || null;

        console.log('Banner1:', this.banner1);
        console.log('Banner2:', this.banner2);
      },
      error: (err) => {
        console.error('Ads API error:', err);
      }
    });
  }

  // ==============================
  // BANNER CLICK → REDIRECT
  // ==============================
  openBannerLink(banner: any) {
  if (!banner?.redirectLink) return;
  this.electronService.openExternal(banner.redirectLink);
}


  // ==============================
  // SCREEN SELECT MODAL
  // ==============================
async screenSelect(autoSelect = true, replaceVideo?: boolean) {
    //  Reset initDone if coming back from disconnect
    if (!autoSelect) {
        this.initDone = false;
    }
    
    const modal = await this.modalCtrl.create({
        component: ScreenSelectComponent,
        backdropDismiss: false,
        componentProps: { autoSelect },
    });

    modal.onDidDismiss().then(data => {
        if (data?.data) {
            if (replaceVideo) {
                this.connectService.replaceVideo(data.data.stream);
            } else {
                this.connectService.videoSource = data.data;
                //  Always allow init if we have video source
                if (!this.initDone) {
                    this.init();
                }
            }
        }
    });

    await modal.present();
}
  // ==============================
  // INIT CONNECTION
  // ==============================
  async init() {
    this.initDone = true;
    await this.connectService.init();
  }
}
