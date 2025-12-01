import { Injectable } from '@angular/core';
import { get, set } from './storage.service';

@Injectable({
    providedIn: 'root',
})
export class AddressBookService {
    addressBook: any[] = [];

    constructor() {}

    async load() {
        const addressBook = await get('addressBook');
        if (addressBook) {
            this.addressBook = addressBook;
        }
    }

    async save() {
        await set('addressBook', this.addressBook);
    }

    async add(adItem) {
        if (this.addressBook?.find(item => adItem.id == item.id)) {
            return;
        }
        if (!this.addressBook) {
            this.addressBook = [];
        }
        this.addressBook.push(adItem);
        await this.save();
    }

    async remove(adItem) {
        this.addressBook = this.addressBook?.filter(
            _adItem => _adItem.id != adItem.id
        );
        await this.save();
    }
    async updateName(id: string, newName: string) {
  const item = this.addressBook.find(adItem => adItem.id === id);
  if (item) {
    item.name = newName;
    await this.save();
  }
}

async savePassword(id: string, password: string) {
    const item = this.addressBook.find(adItem => adItem.id === id);
    if (item) {
        item.password = password;  
        await this.save();
    } else {
      
        await this.add({ id, password, name: `Device ${id}` });
    }
}

async getPassword(id: string): Promise<string | null> {

    if (!this.addressBook || this.addressBook.length === 0) {
        await this.load();
    }
    const item = this.addressBook.find(adItem => adItem.id === id);
    return item?.password || null;
}

}
