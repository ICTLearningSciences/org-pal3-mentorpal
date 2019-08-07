export const MENTOR_SELECTED = "MENTOR_SELECTED" // mentor video was selected

export interface MentorSelection {
    id: string
}
export interface MentorSelectedAction {
    type: typeof MENTOR_SELECTED
    payload: MentorSelection
}

