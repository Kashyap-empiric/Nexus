import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionList, type MentionListHandle } from './MentionList';
import type { ConversationMember } from '@/modules/conversations/types/conversation';
import type { SuggestionOptions } from '@tiptap/suggestion';

export function getMentionSuggestionOptions(
  members: ConversationMember[]
): Omit<SuggestionOptions, 'editor'> {
  return {
    items: ({ query }) => {
      const filtered = members.filter((member) =>
        member.user.username.toLowerCase().startsWith(query.toLowerCase())
      );
      // Map ConversationMember to MentionUser
      return filtered.map((member) => ({
        id: member.user.id,
        username: member.user.username,
        fullName: member.user.fullName,
        avatarUrl: member.user.avatarUrl,
      })).slice(0, 10);
    },
    render: () => {
      let component: ReactRenderer<MentionListHandle>;
      let popup: TippyInstance[];

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'top-start',
          });
        },

        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup[0].hide();
            return true;
          }

          return component.ref?.onKeyDown({ event: props.event }) ?? false;
        },

        onExit() {
          popup[0].destroy();
          component.destroy();
        },
      };
    },
  };
}
