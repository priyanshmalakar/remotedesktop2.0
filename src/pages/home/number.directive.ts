// import { Directive, HostListener, ElementRef } from '@angular/core';

// @Directive({
//     selector: '[number-format]',
// })
// export class NumberDirective {
//     @HostListener('input', ['$event'])
//     onKeyDown(event: KeyboardEvent) {
//         const input = event.target as HTMLInputElement;

//         let trimmed = input.value.replace(/\s+/g, '');
//         if (trimmed.length > 16) {
//             trimmed = trimmed.substr(0, 16);
//         }

//         let numbers = [];
//         for (let i = 0; i < trimmed.length; i += 4) {
//             numbers.push(trimmed.substr(i, 4));
//         }

//         input.value = numbers.join(' ');
//     }
// }



import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
    selector: '[number-format]',
})
export class NumberDirective {
    constructor(private el: ElementRef<HTMLInputElement>) {}

    @HostListener('input', ['$event'])
    onInput(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input) return;

        let trimmed = input.value.replace(/\s+/g, '');
        if (trimmed.length > 16) {
            trimmed = trimmed.substr(0, 16);
        }

        const numbers: string[] = [];
        for (let i = 0; i < trimmed.length; i += 4) {
            numbers.push(trimmed.substr(i, 4));
        }

        // update native value and dispatch input event for angular forms if needed
        input.value = numbers.join(' ');
        const evt = new Event('input', { bubbles: true });
        input.dispatchEvent(evt);
    }
}
