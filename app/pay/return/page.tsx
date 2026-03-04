/* path: app/pay/return/page.tsx */
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main style={{ padding: 16 }}>
      <h1>Возврат после оплаты</h1>
      <p>ЮKassa вернула пользователя в приложение. Финальный статус подтверждается вебхуком.</p>
      <p>Если нужно — показывай тут “Ожидаем подтверждение оплаты…” и периодически опрашивай свой сервер.</p>
    </main>
  );
}
