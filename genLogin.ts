import mineflayer from 'mineflayer';
import mc from 'minecraft-protocol';
import mcdata from 'minecraft-data';

export function genLogin(bot: mineflayer.Bot, client: mc.Client) {
	client.write('success', { uuid: bot._client.uuid, username: bot.username });
	((bot.entities as unknown) as mcdata.Entities).forEach((entity) => {
		switch (true) {
			case hP(entity, [
				'id',
				'uuid',
				'type',
				'position',
				'pitch',
				'yaw',
				'metadata',
				'velocity',
			]):
				client.write('spawn_entity', {
					entityId: entity.id,
					objectUUID: ((entity as unknown) as any).uuid,
				});
				break;

			default:
				break;
		}
	});
}

//* hP stands for hasProperty
function hP(object: any, keys: string[]) {
	keys.forEach((key) => {
		if (Object.prototype.hasOwnProperty.call(object, key)) {
			return false;
		}
	});
	return true;
}
