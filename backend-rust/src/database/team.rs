use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "team")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    #[sea_orm(indexed)]
    pub lobby_id: i32,
    pub current_word_index: i32,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::models::Entity",
        from = "Column::LobbyId",
        to = "super::models::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    Lobby,
    #[sea_orm(has_many = "super::player::Entity")]
    Player,
}

impl Related<super::models::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Lobby.def()
    }
}

impl Related<super::player::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Player.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

pub use Entity as Team;
pub use Model as TeamModel;
pub use ActiveModel as TeamActiveModel;
