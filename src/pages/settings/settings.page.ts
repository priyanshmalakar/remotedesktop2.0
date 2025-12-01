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
        } catch (err) {
            this.compName = '';
        }
        this.cdr.detectChanges();
    }

    async checkForUpdates() {
    try {
        const result = await this.electronService.ipcRenderer.invoke('CHECK_FOR_UPDATES');
        
        if (result.success) {
            console.log('Update check successful:', result);
            // Show success toast to user
            const toast = await this.toastController.create({
                message: 'Update check completed',
                duration: 2000,
                color: 'success'
            });
            await toast.present();
        } else {
            console.error('Update check failed:', result.error);
            // Show error toast to user
            const toast = await this.toastController.create({
                message: 'Update check failed: ' + result.error,
                duration: 3000,
                color: 'danger'
            });
            await toast.present();
        }
    } catch (error) {
        console.log('error', error);
    }
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

    async randomIdChange() {
        await this.settingsService.saveSettings({
            randomId: this.settingsService.settings.randomId,
        });
        this.connectService.reconnect();
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
