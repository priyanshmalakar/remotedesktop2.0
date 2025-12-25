import {
    ChangeDetectorRef,
    Component,
    HostListener,
    Inject,
    Input,
    OnInit,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import 'webrtc-adapter';
import { ElectronService } from '../../app/core/services/electron.service';
import { ConnectService } from './../../app/core/services/connect.service';

import {
    ActionSheetController,
    ModalController,
    ToastController,
} from '@ionic/angular';
import { SettingsService } from '../../app/core/services/settings.service';

export interface DialogData {
    pw: string;
    newPw: string;
}
@Component({
    selector: 'set-pw',
    template: `
        <ion-header>
            <ion-toolbar color="primary">
                <ion-title>{{ 'Set password' | translate }}</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content>
            <div class="p-5">
                <ion-input
                    [class.is-invalid]="!newPasswordCheck.correct"
                    [class.is-valid]="newPasswordCheck.correct"
                    [label]="'Password' | translate"
                    [(ngModel)]="data.pw"
                    label-placement="floating"
                    fill="solid"
                    placeholder="Enter text"></ion-input>

                <ion-input
                    [class.is-invalid]="!newPasswordCheck.correct"
                    [class.is-valid]="newPasswordCheck.correct"
                    [label]="'Password repeat' | translate"
                    [(ngModel)]="data.newPw"
                    label-placement="floating"
                    fill="solid"
                    placeholder="Enter text"></ion-input>

                <app-password-check
                    [password]="data.pw"
                    #newPasswordCheck></app-password-check>
            </div>
        </ion-content>
        <ion-footer>
            <ion-toolbar>
                <ion-button (click)="cancel()">
                    {{ 'Cancel' | translate }}
                </ion-button>
                <ion-button
                    (click)="save()"
                    [disabled]="
                        !(newPasswordCheck.correct && data.pw === data.newPw)
                    ">
                    {{ 'Save' | translate }}
                </ion-button>
            </ion-toolbar>
        </ion-footer>
    `,
})
export class SetPwDialog {
    @Input() data: DialogData;
    @HostListener('document:keydown.enter', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.save();
    }

    constructor(
        private modalCtrl: ModalController,
        private toastController: ToastController,
     

    ) {}

    async save() {
        if (this.data.pw == this.data.newPw) {
            this.modalCtrl.dismiss(this.data, 'save');
        } else {
            const toast = await this.toastController.create({
                message: 'Password does not match',
                duration: 2000,
            });

            await toast.present();
        }
    }

    cancel(): void {
        this.modalCtrl.dismiss(this.data, 'cancel');
    }
}

@Component({
    selector: 'app-settings',
    templateUrl: './settings.page.html',
    styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
    compName = '';
    autoStartEnabled = false;
    autoLaunch;
    hiddenAccess = false;
    updateChecking = false;
    currentVersion = '';

    constructor(
        private electronService: ElectronService,
        private cdr: ChangeDetectorRef,
        private modalCtrl: ModalController,
        private translate: TranslateService,
        private actionSheetCtrl: ActionSheetController,
        private toastController: ToastController,
        public settingsService: SettingsService,
        public connectService: ConnectService
    ) {}
ngOnInit() {
        try {
            const loginSettings = this.electronService.app.getLoginItemSettings();
            this.autoStartEnabled = loginSettings?.executableWillLaunchAtLogin ?? false;
        } catch (err) {
            console.warn('Could not get login item settings', err);
        }
        try {
            this.compName = this.electronService.os.hostname();
            this.currentVersion = this.electronService.app.getVersion();
        } catch (err) {
            this.compName = '';
        }

        // Listen for update events
        this.setupUpdateListeners();
        this.cdr.detectChanges();
    }

    setupUpdateListeners() {
        if (!this.electronService.ipcRenderer) return;

        this.electronService.ipcRenderer.on('update-checking', () => {
            this.updateChecking = true;
            this.showToast('Checking for updates...', 'primary');
        });

        this.electronService.ipcRenderer.on('update-available', (event, info) => {
            this.updateChecking = false;
            this.showToast(`Update available: ${info.version}`, 'success');
            this.confirmDownload();
        });

        this.electronService.ipcRenderer.on('update-not-available', () => {
            this.updateChecking = false;
            this.showToast('You are on the latest version', 'success');
        });

        this.electronService.ipcRenderer.on('update-error', (event, err) => {
            this.updateChecking = false;
            this.showToast(`Update error: ${err.message}`, 'danger');
        });

        this.electronService.ipcRenderer.on('update-download-progress', (event, progress) => {
            this.showToast(`Downloading: ${Math.round(progress.percent)}%`, 'primary', 1000);
        });
    }

    async checkForUpdates() {
        try {
            this.updateChecking = true;
            const result = await this.electronService.ipcRenderer.invoke('CHECK_FOR_UPDATES');
            
            console.log('Update check result:', result);
            
            if (result.success) {
                // The event listeners will handle the UI updates
                console.log('Current version:', result.currentVersion);
            } else {
                this.updateChecking = false;
                await this.showToast('Update check failed: ' + result.error, 'danger');
            }
        } catch (error) {
            this.updateChecking = false;
            console.error('Update check error:', error);
            await this.showToast('Update check failed', 'danger');
        }
    }

    async confirmDownload() {
        const actionSheet = await this.actionSheetCtrl.create({
            header: 'Update Available',
            buttons: [
                {
                    text: 'Download Now',
                    icon: 'download',
                    handler: () => {
                        this.downloadUpdate();
                    }
                },
                {
                    text: 'Later',
                    icon: 'close',
                    role: 'cancel'
                }
            ]
        });
        await actionSheet.present();
    }

    async downloadUpdate() {
        try {
            await this.showToast('Starting download...', 'primary');
            await this.electronService.ipcRenderer.invoke('DOWNLOAD_UPDATE');
        } catch (error) {
            await this.showToast('Download failed', 'danger');
        }
    }

    async showToast(message: string, color: string = 'primary', duration: number = 3000) {
        const toast = await this.toastController.create({
            message,
            duration,
            color
        });
        await toast.present();
    }

    public async selectLanguage(ev): Promise<any> {
        const actionSheetCtrl = await this.actionSheetCtrl.create({
            translucent: true,
            buttons: [
                {
                    text: 'Deutsch',
                    handler: () => {
                        this.changeLanguage({ code: 'de', text: 'Deutsch' });
                    },
                },
                {
                    text: 'English',
                    handler: () => {
                        this.changeLanguage({ code: 'en', text: 'English' });
                    },
                },
            ],
        });

        await actionSheetCtrl.present();
    }

    async changeLanguage(selection: { text: string; code: string }) {
        await this.settingsService.saveSettings({
            language: selection,
        });

        this.settingsService.language = selection;
        this.translate.use(selection.code);
    }

    async changeHiddenAccess() {
        await this.settingsService.saveSettings({
            hiddenAccess: this.settingsService.settings.hiddenAccess,
        });
    }



    async addPw() {
        const modal = await this.modalCtrl.create({
            component: SetPwDialog,
            componentProps: {
                data: {
                    pw: '',
                    newPw: '',
                },
            },
        });
        modal.present();

        const { data, role } = await modal.onWillDismiss();
        if (data?.pw) {
            this.setPwHash(data.pw);
        }
    }

    async setPwHash(pw) {
        try {
            const hash = await this.electronService.bcryptjs.hash(pw, 5);
            await this.settingsService.saveSettings({
                passwordHash: hash,
            });
        } catch (err) {
            console.error('setPwHash error', err);
        }
    }

    changeAutoStart() {
        try {
            if (this.autoStartEnabled) {
                this.electronService.app.setLoginItemSettings({
                    openAsHidden: true,
                    openAtLogin: true,
                    name: 'Remotecontrol Desktop',
                    args: ['--hidden'],
                });
            } else {
                this.electronService.app.setLoginItemSettings({
                    openAsHidden: false,
                    openAtLogin: false,
                    name: 'Remotecontrol Desktop',
                    args: ['--hidden'],
                });
            }
        } catch (err) {
            console.warn('changeAutoStart error', err);
        }
    }
    screenSelect(primary: boolean, secondary: boolean) {
  console.log('Screen select clicked', { primary, secondary });
  // Later, you can connect this with Electron's desktopCapturer
}
}



// import {
//     ChangeDetectorRef,
//     Component,
//     HostListener,
//     Input,
//     OnInit,
// } from '@angular/core';
// import { TranslateService } from '@ngx-translate/core';
// import 'webrtc-adapter';
// import { ElectronService } from '../../app/core/services/electron.service';
// import { ConnectService } from './../../app/core/services/connect.service';

// import {
//     ActionSheetController,
//     ModalController,
//     ToastController,
// } from '@ionic/angular';
// import { SettingsService } from '../../app/core/services/settings.service';

// export interface DialogData {
//     pw: string;
//     newPw: string;
// }

// @Component({
//     selector: 'set-pw',
//     template: `
//         <ion-header>
//             <ion-toolbar color="primary">
//                 <ion-title>{{ 'Set password' | translate }}</ion-title>
//             </ion-toolbar>
//         </ion-header>
//         <ion-content>
//             <div class="p-5">
//                 <ion-input
//                     [class.is-invalid]="!newPasswordCheck.correct"
//                     [class.is-valid]="newPasswordCheck.correct"
//                     [label]="'Password' | translate"
//                     [(ngModel)]="data.pw"
//                     label-placement="floating"
//                     fill="solid"
//                     placeholder="Enter text"></ion-input>

//                 <ion-input
//                     [class.is-invalid]="!newPasswordCheck.correct"
//                     [class.is-valid]="newPasswordCheck.correct"
//                     [label]="'Password repeat' | translate"
//                     [(ngModel)]="data.newPw"
//                     label-placement="floating"
//                     fill="solid"
//                     placeholder="Enter text"></ion-input>

//                 <app-password-check
//                     [password]="data.pw"
//                     #newPasswordCheck></app-password-check>
//             </div>
//         </ion-content>
//         <ion-footer>
//             <ion-toolbar>
//                 <ion-button (click)="cancel()">
//                     {{ 'Cancel' | translate }}
//                 </ion-button>
//                 <ion-button
//                     (click)="save()"
//                     [disabled]="
//                         !(newPasswordCheck.correct && data.pw === data.newPw)
//                     ">
//                     {{ 'Save' | translate }}
//                 </ion-button>
//             </ion-toolbar>
//         </ion-footer>
//     `,
// })
// export class SetPwDialog implements OnInit {
//     @Input() data: DialogData;

//     @HostListener('document:keydown.enter', ['$event'])
//     handleKeyboardEvent(event: KeyboardEvent) {
//         event.preventDefault();
//         event.stopPropagation();
//         this.save();
//     }

//     constructor(
//         private modalCtrl: ModalController,
//         private toastController: ToastController,
//         private settingsService: SettingsService
//     ) {}

//     async ngOnInit() {
//         const remembered = await this.settingsService.getRememberedPassword();
//         if (remembered) {
//             this.data.pw = remembered;
//             this.data.newPw = remembered;
//         }
//     }

//     async save() {
//         if (this.data.pw == this.data.newPw) {
//             this.modalCtrl.dismiss(this.data, 'save');
//         } else {
//             const toast = await this.toastController.create({
//                 message: 'Password does not match',
//                 duration: 2000,
//             });
//             await toast.present();
//         }
//     }

//     cancel(): void {
//         this.modalCtrl.dismiss(this.data, 'cancel');
//     }
// }

// @Component({
//     selector: 'app-settings',
//     templateUrl: './settings.page.html',
//     styleUrls: ['./settings.page.scss'],
// })
// export class SettingsPage implements OnInit {
//     compName = '';
//     autoStartEnabled = false;
//     autoLaunch;
//     hiddenAccess = false;

//     constructor(
//         private electronService: ElectronService,
//         private cdr: ChangeDetectorRef,
//         private modalCtrl: ModalController,
//         private translate: TranslateService,
//         private actionSheetCtrl: ActionSheetController,
//         public settingsService: SettingsService,
//         public connectService: ConnectService
//     ) {}

//     ngOnInit() {
//         try {
//             const loginSettings = this.electronService.app.getLoginItemSettings();
//             this.autoStartEnabled = loginSettings?.executableWillLaunchAtLogin ?? false;
//         } catch (err) {
//             console.warn('Could not get login item settings', err);
//         }
//         try {
//             this.compName = this.electronService.os.hostname();
//         } catch (err) {
//             this.compName = '';
//         }
//         this.cdr.detectChanges();
//     }
// async checkForUpdates() {
//     try {
//         const result = await this.electronService.autoUpdater.autoUpdater.checkForUpdates();
//         console.log('Update check result:', result);
//         // Show user a message that check is complete
//     } catch (error) {
//         console.log('Update check failed:', error);
//         // Show user error message
//     }
// }

//     public async selectLanguage(ev): Promise<any> {
//         const actionSheetCtrl = await this.actionSheetCtrl.create({
//             translucent: true,
//             buttons: [
//                 { text: 'Deutsch', handler: () => this.changeLanguage({ code: 'de', text: 'Deutsch' }) },
//                 { text: 'English', handler: () => this.changeLanguage({ code: 'en', text: 'English' }) },
//             ],
//         });
//         await actionSheetCtrl.present();
//     }

//     async changeLanguage(selection: { text: string; code: string }) {
//         await this.settingsService.saveSettings({ language: selection });
//         this.settingsService.language = selection;
//         this.translate.use(selection.code);
//     }

//     async changeHiddenAccess() {
//         await this.settingsService.saveSettings({ hiddenAccess: this.settingsService.settings.hiddenAccess });
//     }

//     async randomIdChange() {
//         await this.settingsService.saveSettings({ randomId: this.settingsService.settings.randomId });
//         this.connectService.reconnect();
//     }

//     async addPw() {
//         const modal = await this.modalCtrl.create({
//             component: SetPwDialog,
//             componentProps: { data: { pw: '', newPw: '' } },
//         });
//         modal.present();

//         const { data } = await modal.onWillDismiss();
//         if (data?.pw) {
//             await this.setPwHash(data.pw);
//             await this.settingsService.rememberPassword(data.pw); // ✅ remember password
//         }
//     }

//     async setPwHash(pw) {
//         try {
//             const hash = await this.electronService.bcryptjs.hash(pw, 5);
//             await this.settingsService.saveSettings({ passwordHash: hash });
//         } catch (err) {
//             console.error('setPwHash error', err);
//         }
//     }

//     changeAutoStart() {
//         try {
//             if (this.autoStartEnabled) {
//                 this.electronService.app.setLoginItemSettings({
//                     openAsHidden: true,
//                     openAtLogin: true,
//                     name: 'Remotecontrol Desktop',
//                     args: ['--hidden'],
//                 });
//             } else {
//                 this.electronService.app.setLoginItemSettings({
//                     openAsHidden: false,
//                     openAtLogin: false,
//                     name: 'Remotecontrol Desktop',
//                     args: ['--hidden'],
//                 });
//             }
//         } catch (err) {
//             console.warn('changeAutoStart error', err);
//         }
//     }

//     screenSelect(primary: boolean, secondary: boolean) {
//         console.log('Screen select clicked', { primary, secondary });
//     }
// }
