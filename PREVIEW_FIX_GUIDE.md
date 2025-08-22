# FlickMV プレビュー機能修正ガイド

## 🔍 問題の概要

現在のプレビュー機能で以下の問題が確認されました：

1. **Preview.tsx**: 実際の画像/動画ファイルが読み込まれていない
2. **Editor.tsx**: Previewコンポーネントが統合されていない
3. **メディア処理**: アップロードされたファイルの表示が不完全

## 🛠️ 修正手順

### ステップ 1: Preview.tsx の修正

**ファイル**: `client/src/components/preview/Preview.tsx`

主な変更点：
- `loadMediaFile` 関数を追加してメディアファイルの実際の読み込みを実装
- `renderImageClip` と `renderVideoClip` 関数で実際のメディア描画を実装
- エラーハンドリングとフォールバック表示を追加
- メディアファイルのキャッシュ機能を追加

### ステップ 2: Editor.tsx の修正

**ファイル**: `client/src/pages/Editor.tsx`

主な変更点：
- ミニプレビューエリアに実際の `Preview` コンポーネントを統合
- プレビューウィンドウ更新機能を実装
- Canvas コンテンツの同期機能を追加

### ステップ 3: 修正後の確認項目

1. **メディアファイルのアップロード**
   - 画像ファイルが正しく表示されること
   - 動画ファイルが再生されること
   - 音声ファイルの波形が表示されること

2. **プレビュー機能**
   - ミニプレビューに実際のコンテンツが表示されること
   - ポップアウトプレビューが正常に動作すること
   - デバイスフレーム切り替えが機能すること

3. **パフォーマンス**
   - プレビューの描画が滑らかであること
   - メモリリークが発生しないこと

## 🚀 実装のポイント

### メディアファイルの読み込み

```typescript
const loadMediaFile = useCallback(async (mediaFile: any): Promise<HTMLImageElement | HTMLVideoElement | null> => {
  if (loadedMedia.has(mediaFile.id)) {
    return loadedMedia.get(mediaFile.id) || null;
  }

  if (mediaFile.type === 'image') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        setLoadedMedia(prev => new Map(prev).set(mediaFile.id, img));
        resolve(img);
      };
      img.onerror = reject;
      img.src = mediaFile.url;
    });
  }
  // ... 動画の場合も同様
}, [loadedMedia]);
```

### Canvas レンダリング

```typescript
const renderImageClip = async (ctx: CanvasRenderingContext2D, mediaFile: any, clip: any, progress: number) => {
  const img = await loadMediaFile(mediaFile) as HTMLImageElement;
  
  if (img && img.complete) {
    // アスペクト比を維持したスケーリング
    const scaleX = ctx.canvas.width / img.width;
    const scaleY = ctx.canvas.height / img.height;
    const scale = Math.max(scaleX, scaleY);
    
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const drawX = (ctx.canvas.width - drawWidth) / 2;
    const drawY = (ctx.canvas.height - drawHeight) / 2;
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }
};
```

## 🔧 追加の改善提案

### 1. パフォーマンス最適化

- **WebWorker** を使用した画像処理
- **OffscreenCanvas** によるバックグラウンド描画
- **RequestAnimationFrame** による滑らかなアニメーション

### 2. プレビュー品質設定

```typescript
const previewQualitySettings = {
  low: { scale: 0.25, fps: 15 },
  medium: { scale: 0.5, fps: 30 },
  high: { scale: 1.0, fps: 60 }
};
```

### 3. エフェクトの実装

- **リアルタイムエフェクト処理**
- **GPU アクセラレーション** (WebGL)
- **エフェクトチェーン** の最適化

## 🎯 テスト項目

### 基本機能テスト

- [ ] 画像ファイルのプレビュー表示
- [ ] 動画ファイルの再生プレビュー
- [ ] 音声ファイルの波形表示
- [ ] タイムライン上のクリップ同期

### 高度な機能テスト

- [ ] Ken Burns エフェクトの適用
- [ ] デバイスフレーム切り替え
- [ ] フルスクリーンモード
- [ ] Picture-in-Picture

### パフォーマンステスト

- [ ] 大きなファイルの読み込み速度
- [ ] 複数クリップの同時再生
- [ ] メモリ使用量の確認
- [ ] CPU使用率の測定

## 📝 注意事項

1. **ブラウザ互換性**: 一部のブラウザでは Canvas や Video API の制限があります
2. **ファイルサイズ制限**: 大きなメディアファイルはメモリ不足を引き起こす可能性があります
3. **CORS**: 外部URLからのメディアファイル読み込み時は CORS 設定が必要です

## 🏁 まとめ

この修正により、FlickMV のプレビュー機能が実際のメディアファイルを正しく表示し、リアルタイムでの編集プレビューが可能になります。修正後は必ず上記のテスト項目を確認して、機能が正常に動作することを確認してください。
