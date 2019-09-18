import { Store, AnyAction } from "redux";

export interface ExpectedState {
  isMet?: boolean;
  testExpectations: () => void;
  unmetMessage: string;
}

export class ExpectIntermediateStates<StoreType> {
  private expectedStates: ExpectedState[];
  private store: Store<StoreType, AnyAction>;

  public constructor(store: Store<StoreType>, expectedStates: ExpectedState[]) {
    this.expectedStates = expectedStates;
    this.store = store;
  }

  public subscribe() {
    this.store.subscribe(() => {
      const nextUnmet = this.expectedStates.find(x => !x.isMet);
      if (!nextUnmet) {
        return;
      }
      nextUnmet.testExpectations();
      nextUnmet.isMet = true;
    });
  }

  public testExpectations() {
    this.expectedStates.forEach(inState => {
      expect({ message: inState.unmetMessage, isMet: inState.isMet }).toEqual({
        message: inState.unmetMessage,
        isMet: true,
      });
    });
  }
}
