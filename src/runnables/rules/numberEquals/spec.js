import { random } from 'faker';
import numberEquals from '.';

describe('Tests numberEquals rule', () => {
    let arg0;

    describe('Arguments are numbers', () => {
        beforeEach(() => {
            arg0 = random.number();
        });

        describe('When first argument is larger', () => {

            it('Should return false', () => {
                expect(numberEquals(arg0, arg0 - 1)).toBe(false);
            });
        });

        describe('When first argument is smaller', () => {

            it('Should return false', () => {
                expect(numberEquals(arg0, arg0 + 1)).toBe(false);
            });
        });

        describe('When values are equal', () => {
            it('Should return true', () => {
                expect(numberEquals(arg0, arg0)).toBe(true);
            });
        });
    });

    describe('Arguments are numeric strings', () => {
        describe('When first argument is larger', () => {
            it('Should return false', () => {
                expect(numberEquals(`${arg0}`, `${arg0 - 1}`)).toBe(false);
            });
        });

        describe('When first argument is smaller', () => {
            it('Should return false', () => {
                expect(numberEquals(`${arg0}`, `${arg0 + 1}`)).toBe(false);
            });
        });

        describe('When values are equal', () => {
            it('Should return true', () => {
                expect(numberEquals(arg0, arg0)).toBe(true);
            });
        });
    });

    describe('Arguments are non numeric', () => {
        [random.word(), (`${random.number()}`).split(''), {}].forEach((element) => {
            it('Should return false', () => {
                expect(numberEquals(element, 0)).toBe(false);
            });
        });
    });
});
