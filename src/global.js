import { atom } from 'nanostores'

export const current_pathname = atom(/** @type{string | null} */(document.location.pathname));
