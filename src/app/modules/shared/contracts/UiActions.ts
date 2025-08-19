interface UiBase {
  label: string;
  id: string;
}

export interface UiLink extends UiBase {
  image: string;
}

export interface UiAction extends UiBase {
  icon: string;
}
