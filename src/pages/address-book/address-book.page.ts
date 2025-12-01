import { Component, OnInit } from '@angular/core';
import { AddressBookService } from '../../app/core/services/address-book.service';
import { ConnectService } from '../../app/core/services/connect.service';
import { FormsModule } from '@angular/forms';


@Component({
    selector: 'app-address-book',
    templateUrl: './address-book.page.html',
    styleUrls: ['./address-book.page.scss'],
})
export class AddressBookPage implements OnInit {
    constructor(
        public addressBookService: AddressBookService,
        public connectService: ConnectService
    ) {}

    async ngOnInit() {
        await this.addressBookService.load();
    }

    updateLabel(id: string, name: string) {
  this.addressBookService.updateName(id, name);
}

    connect(id: string) {
        this.connectService.connect(id);
    }
}
