import type { Bot } from "mineflayer"

export class StateData {
  recipes: number[] = []
  bot: Bot

  constructor(bot: Bot) {
    this.bot = bot
  }

  onCToSPacket(name: string, data: any) {
    switch (name) {
      case 'position':
        this.bot.entity.position.x = data.x;
        this.bot.entity.position.y = data.y;
        this.bot.entity.position.z = data.z;
        this.bot.entity.onGround = data.onGround;
        this.bot.emit('move', this.bot.entity.position) // If bot is not in control physics are turned off
        break;
      case 'position_look': // FALLTHROUGH
        this.bot.entity.position.x = data.x;
        this.bot.entity.position.y = data.y;
        this.bot.entity.position.z = data.z;
      case 'look':
        this.bot.entity.yaw = ((180 - data.yaw) * Math.PI) / 180;
        this.bot.entity.pitch = -(data.pitch * Math.PI) / 180;
        this.bot.entity.onGround = data.onGround;
        this.bot.emit('move', this.bot.entity.position) // If bot is not in control physics are turned off
        break;
      case 'held_item_slot':
        this.bot.quickBarSlot = data.slot;
        this.bot._client.emit('mcproxy:heldItemSlotUpdate') // lol idk how to do it better
        break;
    }
  }

  /**
   * Data to update the bot as it has its physics disabled when not in control
   * @param name 
   * @param packetData 
   */
  onSToCPacket(name: string, packetData: any) {
    switch (name) {
      case 'position':
        this.bot.entity.position.x = packetData.x;
        this.bot.entity.position.y = packetData.y;
        this.bot.entity.position.z = packetData.z;
        this.bot.entity.onGround = packetData.onGround;
        break;
      case 'position_look': // FALLTHROUGH
        this.bot.entity.position.x = packetData.x;
        this.bot.entity.position.y = packetData.y;
        this.bot.entity.position.z = packetData.z;
      case 'look':
        this.bot.entity.yaw = ((180 - packetData.yaw) * Math.PI) / 180;
        this.bot.entity.pitch = -(packetData.pitch * Math.PI) / 180;
        this.bot.entity.onGround = packetData.onGround;
        break;
      case 'held_item_slot':
        this.bot.quickBarSlot = packetData.slot; // Carefull S->C is slot where C->S is slotId (????)
        break;
    }
  }
}