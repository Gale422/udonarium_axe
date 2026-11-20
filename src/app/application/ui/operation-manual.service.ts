/**
 * アプリから、このサーバーの利用ガイドの操作マニュアルを開く部品。
 */
import { Injectable } from '@angular/core';
import HOSTED_GUIDE_PLACES from '@axe/infrastructure/hosted-guide/hosted-guide-places.json';

/**
 * 操作マニュアルを開く部品。
 */
@Injectable({ providedIn: 'root' })
export class OperationManualService {
  /**
   * このサーバーの利用ガイドの、操作マニュアルの入口のページを、新しいタブで開く。
   */
  open(): void {
    // 利用ガイドは、アプリと同じサイトに置き、置き場所はサイトのいちばん上からのパスで持つ。
    // アプリもサイトのいちばん上で動くので、公開のサイトでも手元でも、アプリと同じサイトの利用ガイドが開く。
    // 遊んでいる部屋を閉じずに読めるよう新しいタブで開き、開いたタブからアプリを触れないよう、元のタブとのつながりは渡さない
    window.open(`${HOSTED_GUIDE_PLACES.guide}${HOSTED_GUIDE_PLACES.manual}`, '_blank', 'noopener');
  }
}
