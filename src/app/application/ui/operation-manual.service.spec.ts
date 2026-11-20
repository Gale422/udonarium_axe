/**
 * 操作マニュアルを開く部品のテスト。
 */
import { TestBed } from '@angular/core/testing';
import { OperationManualService } from '@axe/application/ui/operation-manual.service';

describe('アプリの操作マニュアルを開くメニューの項目の、開くページ', () => {
  it('同じサイトの利用ガイドの、操作マニュアルの入口のページ /docs/manual/ を、新しいタブで、元のタブとのつながりを渡さずに開く', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    TestBed.inject(OperationManualService).open();
    expect(open).toHaveBeenCalledExactlyOnceWith('/docs/manual/', '_blank', 'noopener');
  });
});
