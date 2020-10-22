import mineflayer from 'mineflayer';
import mc from 'minecraft-protocol';
export function genLogin(bot: mineflayer.Bot, client: mc.Client) {
	client.write('success', { uuid: bot._client.uuid, username: bot.username });
	//client.write('spawn_entity', { entityId: bot.entity.metadata.uuid });
}
